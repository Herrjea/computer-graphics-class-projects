
/*

Done:
Rotating blades (from Project #1).
Chopper control (from Project #2).
View control (rotate around vertical axis, rotate around one of the horizontal axes, zoom in, zoom out).
Procedurally generated grid of NxN squares.
The grid's vertices have no position or normal information.
Index buffer for indexed rendering (from Project #2).
Texture binding for the terrain to compute the height and normal of each floor vertex.
Fixed light in the scene.
Phong reflection model (ambient, diffuse).
Garaud interpolation model, leaving hard computations for the vertex shader, as described as WebGL development best practice.
Lighting is computed for all the active lights in the scene
Glowing bullets, as a point light source, being affected by gravity, and dying if they touch the horizontal origin plane.

Not done:
Z axis as the vertical axis (Y is, instead).
Specular component of the Phong interpolation model.

Done differently:
Terrain horizontal coordinates calculation. The scaling and translating of the terrain has been made in the grid constructor, instead of in the vertex shader as was proposed, since it's not going to be changed in this project during the execution of the program and it only has to be computed once, and the steps to do both were essentially the same.
Terrain's normal vectors calculation.
Air friction is taken into account for the glowing bullets.

Done wrong:
The grid's resolution. When N > 15, the NxN grid object generates the texel values as expected, but they aren't rendered as intended.
Lighting in some vertices of the terrain. Even though normals seemed to be working well judging from the behaviour of the main light on them, the vertices near the center of the grid are lit stronger than those on outer positions, which sometimes reflect no perceivable light from the glowing bullets.

Done additionally:
Chopper color based of horizontal position (from Project #2).
Chopper movement model (linear acceleration and momentum, angular acceleration and momentum) (from Project #2).
Gradual increase of the blades' speed when the chopper moves forward or upwards (from Project #2).
Chopper swinging animation (from Project #2).
Parametric color for the ground.
The orientation of the main light in the scene can be changed with the keys C and B, towards negative and positive X respectively.
Glowing bullets take the color the chopper had at the moment they were shot.
Virtually unlimited glowing bullets. It's been set to 100, but there will never be nearly 100 bullets in the scene, given the rate at which they can be shot and the time it takes them to die.
Texture editing to randomly alter the terrain, modifying the R components of the pixels of the stored texture.

*/


const maxPointLights = 100;


// Vertex shader program
var VSHADER_SOURCE =

    'attribute vec4 a_Position;\n' +
    'attribute vec3 a_Normal;\n' +
    'attribute vec4 a_Color;\n' +
    'attribute vec2 a_TexCoord;\n' +

    'uniform mat4 u_mMatrix;\n' +
    'uniform mat4 u_vMatrix;\n' +
    'uniform mat4 u_pMatrix;\n' +
    'uniform sampler2D u_Sampler;\n' +
    'uniform float u_Step;\n' +
    'uniform float u_LightX;\n' +
    'uniform float u_PointLights;\n' +

    'varying vec4 v_Color;\n' +
    'varying float v_Height;\n' +
    'varying vec4 heightOffset;\n' +
    'varying vec2 v_TexCoord;\n' +

    'float upPos, downPos, leftPos, rightPos;\n' +
    'float upHeight, downHeight, leftHeight, rightHeight;\n' +
    'float nDotL, distanceRate;\n' +
    'float heightScale = 7.0;\n' +
    'float rate;\n' +
    'vec4 vertexPosition, worldPosition;\n' +
    'vec3 derivateS, derivateT, normal;\n' +
    'vec3 baseColor;\n' +

    // Fixed light's color
    'vec3 lightColor = vec3( 0.8, 0.8, 0.8 );\n' +
    // Fixed light's direction
    'vec3 lightDirection = normalize( vec3( u_LightX, 10.0, -2.0 ) );\n' +
    // Ambient light's color
    'vec3 ambientLight = vec3( 0.5, 0.5, 0.5 );\n' +

    'vec3 diffuse, ambient;\n' +

    // Point lights' colors and positions
    'uniform vec3 u_PointLightColor[' + maxPointLights + '];\n' +
    'uniform vec3 u_PointLightPos[' + maxPointLights + '];\n' +


    'void main() {\n' +

       // Check whether a vertex belongs to the floor
    '  v_Height = a_Position.y;\n' +

       // Calculate position of the floor vertices
    '  if ( v_Height == 0.0 ){\n' +
    '    heightOffset = vec4( 0.0,texture2D(u_Sampler, a_TexCoord).r * heightScale, 0.0, 0.0 );\n' +
    '    vertexPosition = a_Position + heightOffset;\n' +
    '    gl_Position = u_pMatrix * u_vMatrix * u_mMatrix * vertexPosition;\n' +
    '    worldPosition = vertexPosition;\n' +

       // Calculate position of the chopper and bullets vertices
    '  }else {\n' +
    '    gl_Position = u_pMatrix * u_vMatrix * u_mMatrix * a_Position;\n' +
    '    worldPosition = u_pMatrix * a_Position;\n' +
    '  }\n' +


       // Calculate normals for the floor vertices
    '  if ( v_Height == 0.0 ){\n' +

       // Get the location of the four closest vertices, in taxicab distance.
       // We don't need to explicitly handle over- or underflowed positions
       // if we tell WebGL to clamp the texture wrapping
    '    upPos = a_TexCoord.t + u_Step;\n' +
    '    downPos = a_TexCoord.t - u_Step;\n' +
    '    leftPos = a_TexCoord.s - u_Step;\n' +
    '    rightPos = a_TexCoord.s + u_Step;\n' +

         // Find the height of those three closest vertices
    '    upHeight = texture2D( u_Sampler, vec2( a_TexCoord.s, upPos ) ).r * heightScale;\n' +
    '    downHeight = texture2D( u_Sampler, vec2( a_TexCoord.s, downPos ) ).r * heightScale;\n' +
    '    leftHeight = texture2D( u_Sampler, vec2( leftPos, a_TexCoord.t ) ).r * heightScale;\n' +
    '    rightHeight = texture2D( u_Sampler, vec2( rightPos, a_TexCoord.t ) ).r * heightScale;\n' +

         // Aproximate the partial derivates using position and inclination
         // of the four closest vertices
    '    derivateS = vec3( 2.0 * u_Step, rightHeight - leftHeight, 0.0 );\n' +
    '    derivateT = vec3( 0.0, downHeight - upHeight, -2.0 * u_Step );\n' +

         // Compute the normal as the cross product of the partial derivates
    '    normal = normalize( cross( derivateS, derivateT ) );\n' +


       // Read the attribute normal information
       // for vertices other than those of the floor
    '  } else {\n' +
    '     normal = normalize( ( u_mMatrix * vec4( a_Normal, 0.0 ) ).xyz ) * 3.0;\n' +
    '  }\n' +

       // Calculate base color
       // (needed for the snowy peaks)
    '  if ( v_Height == 0.0 ){\n' +
    '    baseColor = a_Color.rgb;\n' +
    '  }else {\n' +
    '    rate = texture2D(u_Sampler, v_TexCoord).r;\n' +
    '    baseColor = mix( vec4( 1.0, 1.0, 1.0, 1.0 ), a_Color, heightOffset / heightScale ).rgb;\n' +
    '  }\n' +
    //'  baseColor = a_Color.rgb;\n' +


       // Dot product of light direction and surface orientation
    '  nDotL = max( dot( lightDirection, normal ), 0.0 );\n' +

       // Calculate render color based on vertex color, normal and lighting
    '  diffuse = lightColor * baseColor * nDotL;\n' +
    '  ambient = ambientLight * baseColor;\n' +


       // Add lighting for every bullet in the scene

    '  for ( float i = 0.0; i >= 0.0; i++ ){\n' +
    '    if ( i == u_PointLights ){\n' +
    '      break;\n' +
    '    }\n' +

    '    nDotL = max( normalize( dot(u_PointLightPos[int(i)], normal ) ), 0.0 );\n' +
    '    distanceRate = 1.0 - min( distance( worldPosition, vec4( u_PointLightPos[int(i)], 1.0 ) ), 8.0 ) / 8.0;\n' +
    '    diffuse += u_PointLightColor[int(i)] * baseColor * nDotL * distanceRate;\n' +
    '  }\n' +


       // Calculate the final color of the vertex
    '  v_Color = vec4( diffuse + ambient, a_Color.a );\n' +


       // Let the fragment shader know which pixel was used
    '  v_TexCoord = a_TexCoord;\n' +

    '}\n';


// Fragment shader program
var FSHADER_SOURCE =

    '#ifdef GL_ES\n' +
    'precision mediump float;\n' +
    '#endif\n' +
    'uniform vec4 u_FragColor;\n' +
    'uniform sampler2D u_Sampler;\n' +
    'varying vec4 v_Color;\n' +
    'varying float v_Height;\n' +
    'varying vec2 v_TexCoord;\n' +
    'float rate;\n' +


    'void main() {\n' +


        // The floor vertices take a color based on their horizontal position,
        // and are interpolated with white based on their height
     '  if ( u_FragColor.r == 0.0 ){\n' +
     '    gl_FragColor = v_Color;\n' +

    '  } else {\n' +

         // Polynomial interpolation of white and another color
         // for the actual chopper
    '    rate = (v_Height + 1.0) / 2.0;\n' +
    '    if ( rate > 1.0 )\n' +
    '      rate = 1.0;\n' +
    '    else if ( rate < -1.0 )\n' +
    '      rate = -1.0;\n' +
    '    gl_FragColor = mix( v_Color, u_FragColor, pow(rate,1.7) );\n' +
    '  }\n' +
    '}\n';



// Controller keys
var fwdAccKey = 'ArrowUp';
var bwdAccKey = 'ArrowDown';
var rightTurnKey = 'ArrowRight';
var leftTurnKey = 'ArrowLeft';
var uwdAccKey = 'KeyA';
var dwdAccKey = 'KeyZ';
var shootKey = 'Space';
var lightRightKey = 'KeyB';
var lightLeftKey = 'KeyC';
var zoomInKeyA = 'BracketRight';
var zoomInKeyB = '';
var zoomOutKeyA = 'Slash';
var zoomOutKeyB = '';


// Simulation of time for the position swinging animation
var time = 0.0;
var swingingSpeed = 0.04;
var factor = 8.0;   // effect reduction
var offsetX, offsetY, offsetZ;


// Print state during execution
var debug = false;


// Container object storing the fired bullets
var bullets = new Bullets();


// Texture variable shared between different functions
var texture;



function main() {


    // Retrieve <canvas> element
    var canvas = document.getElementById('webgl');

    // Get the rendering context for WebGL
    var gl = canvas.getContext( 'webgl' );
    var gl = getWebGLContext(canvas);
    if (!gl) {
        console.log('Failed to get the rendering context for WebGL');
        return;
    }

    // Initialize shaders
    if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
        console.log('Failed to intialize shaders.');
        return;
    }

    // Set the vertex information
    var buffersInfo = initVertexBuffers(gl);

    // Set texture
    var source = '../img/surface.jpg';
    if ( !initTextures( gl, source ) ){
        console.log( 'Failed to intialize the texture.' );
        return;
    }

    // Set the clear color and enable the depth test
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.enable(gl.DEPTH_TEST);

    // Get the storage location of u_mMatrix
    var u_mMatrix = gl.getUniformLocation(gl.program, 'u_mMatrix');
    if (!u_mMatrix) {
        console.log('Failed to get the storage location of u_mMatrix');
        return;
    }

    // Get the storage location of u_vMatrix
    var u_vMatrix = gl.getUniformLocation(gl.program, 'u_vMatrix');
    if (!u_vMatrix) {
        console.log('Failed to get the storage location of u_vMatrix');
        return;
    }

    // Get the storage location of u_pMatrix
    var u_pMatrix = gl.getUniformLocation(gl.program, 'u_pMatrix');
    if (!u_pMatrix) {
        console.log('Failed to get the storage location of u_pMatrix');
        return;
    }

    // Get the storage location of u_FragColor
    var u_FragColor = gl.getUniformLocation( gl.program, 'u_FragColor' );
    if (!u_FragColor) {
        console.log('Failed to get the storage location of u_FragColor');
        return;
    }

    // Get the storage location of a_TexCoord
    var a_TexCoord = gl.getAttribLocation(gl.program, 'a_TexCoord');
    if (a_TexCoord < 0) {
      console.log('Failed to get the storage location of a_TexCoord');
      return -1;
    }

    // Get the storage location of a_Normal
    var a_Normal = gl.getAttribLocation(gl.program, 'a_Normal');
    if (a_Normal < 0) {
      console.log('Failed to get the storage location of a_Normal');
      return -1;
    }

    var u_LightX = gl.getUniformLocation(gl.program, 'u_LightX');
    if (!u_LightX) {
        console.log('Failed to get the storage location of u_LightX');
        return false;
    }

    var u_PointLights = gl.getUniformLocation(gl.program, 'u_PointLights');
    if (!u_PointLights) {
        console.log('Failed to get the storage location of u_PointLights');
        return false;
    }
    gl.uniform1f( u_PointLights, 0 );

    var u_PointLightColor = gl.getUniformLocation(gl.program, 'u_PointLightColor');
    if (!u_PointLightColor) {
        console.log('Failed to get the storage location of u_PointLightColor');
        return false;
    }

    var u_PointLightPos = gl.getUniformLocation(gl.program, 'u_PointLightPos');
    if (!u_PointLightPos) {
        console.log('Failed to get the storage location of u_PointLightPos');
        return false;
    }
    gl.uniform3fv( u_PointLightPos, bullets.positionInfoArray() );


    // Matrices passed to the vertex shader.
    // We let the shader multiply them, instead of having
    // JavaScript do it, for performance purposes
    // and readability of the rendering code
    var modelMatrix = new Matrix4();
    var viewMatrix = new Matrix4();
    var projectionMatrix = new Matrix4();


    /// Variables needed for the movement system ///


    // Current chopper rotation angle
    var chopperAngle = 0.0;

    // Current chopper position
    var chopperPosition = {
        'x' : 0.0,
        'y' : 7.0,
        'z' : 0.0
    };

    // Chopper horizontal linear speed management
    var chopperHorizontalLinearSpeed = 0;
    var chopperHorizontalLinearAcceleration = 0.02;
    var chopperHorizontalLinearFriction = 0.01;
    var chopperMaxHorizontalLinearSpeed = 0.3;

    // Chopper vertical linear speed management
    var chopperVerticalLinearSpeed = 0;
    var chopperVerticalLinearAcceleration = 0.015;
    var chopperVerticalLinearFriction = 0.0035;
    var chopperMaxVerticalLinearSpeed = 0.3;

    // Chopper angular speed management
    var chopperAngularSpeed = 0.0;
    var chopperAngularAcceleration = 0.8;
    var chopperAngularFriction = 0.6;
    var chopperMaxAngularSpeed = 7.0;

    // Blade rotation management
    var bladeAngle = 0.0;
    var bladeSpeed = 10.0;
    var bladeBaseSpeed = 5.0;
    var bladeMaxSpeed = 20.0;
    var bladeAcceleration = 2.0;
    var bladeFriction = 0.5;

    // Key state control variables
    var accelerating = false;
    var decelerating = false;
    var ascending = false;
    var descending = false;
    var turningRight = false;
    var turningLeft = false;


    /// Variables needed for the camera movement management

    // Current camera rotation position
    var cameraPosition = {
        'x' : 0.0,
        'y' : 0.0
    };

    var cameraSpeed = 5.0;

    var cameraZoom = 1.0;


    // "Fixed" light's X coordinate position
    var lightX = -7.0;

    // Control bullets shooting requests
    var bulletRequest = false;

    // Control requests to alter the terrain through the texture
    var alterFloorRequest = false;


    // Change state depending on key presses
    document.addEventListener( 'keydown', function(e){

        if ( e.shiftKey ){

            // Camera
            if ( e.code == fwdAccKey )
                cameraPosition.x -= cameraSpeed;
            else if ( e.code == bwdAccKey )
                cameraPosition.x += cameraSpeed;
            else if ( e.code == rightTurnKey )
                cameraPosition.y += cameraSpeed;
            else if ( e.code == leftTurnKey )
                cameraPosition.y -= cameraSpeed;

            if ( e.code == shootKey )
                alterFloorRequest = true;

        }else{

            // Position
            if ( e.code == fwdAccKey )
                accelerating = true;
            else if ( e.code == bwdAccKey )
                decelerating = true;
            else if ( e.code == uwdAccKey )
                ascending = true;
            else if ( e.code == dwdAccKey )
                descending = true;
            else if ( e.code == rightTurnKey )
                turningRight = true;
            else if ( e.code == leftTurnKey )
                turningLeft = true;
            else if ( e.code == lightLeftKey )
                lightX--;
            else if ( e.code == lightRightKey )
                lightX++;
            else if ( e.code == zoomInKeyA )
                cameraZoom /= 1.1;
            else if ( e.code == zoomOutKeyA )
                cameraZoom *= 1.1;

            if ( e.code == shootKey )
                bulletRequest = true;
        }
    } );


    // Change state depending on key releases
    document.addEventListener( 'keyup', function(e){

        if ( e.code == fwdAccKey )
            accelerating = false;
        else if ( e.code == bwdAccKey )
            decelerating = false;
        else if ( e.code == uwdAccKey )
            ascending = false;
        else if ( e.code == dwdAccKey )
            descending = false;
        else if ( e.code == rightTurnKey )
            turningRight = false;
        else if ( e.code == leftTurnKey )
            turningLeft = false;
    });


    var tick = function() {


        // Alter the terrain through the texture
        if ( alterFloorRequest ){
            modifyTexture( gl, texture );
            alterFloorRequest = false;

        }


        // Update properties based on movement model

        // Update horizontal linear speed
        if ( accelerating && chopperHorizontalLinearSpeed < chopperMaxHorizontalLinearSpeed )
            chopperHorizontalLinearSpeed += chopperHorizontalLinearAcceleration;
        else if ( decelerating && chopperHorizontalLinearSpeed > -chopperMaxHorizontalLinearSpeed )
            chopperHorizontalLinearSpeed -= 0.1*chopperHorizontalLinearAcceleration;
        else if ( !accelerating && !decelerating ){
            if ( chopperHorizontalLinearSpeed > chopperHorizontalLinearFriction )
                chopperHorizontalLinearSpeed -= chopperHorizontalLinearFriction;
            else if ( chopperHorizontalLinearSpeed < -chopperHorizontalLinearFriction )
                chopperHorizontalLinearSpeed += chopperHorizontalLinearFriction;
            else
                chopperHorizontalLinearSpeed = 0;
        }

        // Update vertical linear speed
        if ( ascending && chopperVerticalLinearSpeed < chopperMaxVerticalLinearSpeed )
            chopperVerticalLinearSpeed += chopperVerticalLinearAcceleration;
        else if ( descending && chopperVerticalLinearSpeed > -chopperMaxVerticalLinearSpeed )
            chopperVerticalLinearSpeed -= chopperVerticalLinearAcceleration;
        else if ( !ascending && !descending ){
            if ( chopperVerticalLinearSpeed > chopperVerticalLinearFriction )
                chopperVerticalLinearSpeed -= chopperVerticalLinearFriction;
            else if ( chopperVerticalLinearSpeed < -chopperVerticalLinearFriction )
                chopperVerticalLinearSpeed += chopperVerticalLinearFriction;
            else
                chopperVerticalLinearSpeed = 0;
        }

        // Update angular speed
        if ( turningRight ){
            if ( chopperAngularSpeed > (-chopperMaxAngularSpeed) )
                chopperAngularSpeed -= chopperAngularAcceleration;
        }else if ( turningLeft ){
            if ( chopperAngularSpeed < chopperMaxAngularSpeed )
                chopperAngularSpeed += chopperAngularAcceleration;
        }else if ( chopperAngularSpeed >= chopperAngularFriction )
            chopperAngularSpeed -= chopperAngularFriction;
        else if ( chopperAngularSpeed <= -chopperAngularFriction )
            chopperAngularSpeed += chopperAngularFriction;
        else
            chopperAngularSpeed = 0.0;

        // Update orientation
        chopperAngle += chopperAngularSpeed;

        // Convert to radians for Math libraries
        var angle = chopperAngle * Math.PI / 180.0;
        // Update chopper position
        chopperPosition.x += Math.sin( angle ) * chopperHorizontalLinearSpeed;
        chopperPosition.y += chopperVerticalLinearSpeed;
        chopperPosition.z += Math.cos( angle ) * chopperHorizontalLinearSpeed;

        // Update blades angle
        if ( accelerating || ascending ){
            if ( bladeSpeed < bladeMaxSpeed )
                bladeSpeed += bladeAcceleration;
        }
        else if ( bladeSpeed > bladeBaseSpeed )
            bladeSpeed -= bladeFriction;
        bladeAngle += bladeSpeed;

        // Position swinging animation
        offsetX = Math.cos( time ) / factor;
        offsetY = Math.cos( time * 0.7 ) / factor;
        offsetZ = Math.cos( time * 1.7 ) / factor;
        time += swingingSpeed;

        // Scaling for the blades when the chopper is
        // either accelerating or ascending
        var bladesScale;
        if ( chopperHorizontalLinearSpeed > 0 || chopperVerticalLinearSpeed > 0 )
            bladesScale =
                1 + Math.max(chopperHorizontalLinearSpeed + chopperVerticalLinearSpeed) * 1.5;
        else
            bladesScale = 1.0;


        // Add a new bullet if the used pressed the spacebar
        if ( bulletRequest ){
            bullets.add( new Bullet( chopperPosition, chopperAngle, gl ) );
            bulletRequest = false;
        }


        // Print state
        if ( debug )
            console.log(
                // Movement
                '\n\n\n' +
                'accel:\t' + (accelerating|0) + '\n' +
                'decel:\t' + (decelerating|0) + '\n' +
                'ascen:\t' + (ascending|0) + '\n' +
                'desce:\t' + (descending|0) + '\n' +
                'Rturn:\t' + (turningRight|0) + '\n' +
                'Lturn:\t' + (turningLeft|0) + '\n' +
                '\n' +
                // Position
                'position:\n' +
                    '\t' + chopperPosition.x + '\n' +
                    '\t' + chopperPosition.y + '\n' +
                    '\t' + chopperPosition.y + '\n' +
                'angle:\t ' + chopperAngle + '\n' +
                '\n\n\n'
            );


        // Draw the chopper
        draw(
            gl, buffersInfo, cameraPosition,
            chopperAngle, bladeAngle, chopperPosition, bladesScale,
            modelMatrix, viewMatrix, projectionMatrix,
            u_mMatrix, u_vMatrix, u_pMatrix, u_FragColor, a_TexCoord, a_Normal, u_LightX, lightX, u_PointLights, u_PointLightColor, u_PointLightPos, cameraZoom
        );


        // Request the browser to call tick
        requestAnimationFrame(tick, canvas);
    };

    tick();
}



function draw( gl, buffersInfo, cameraPosition, chopperAngle, bladeAngle,
 rawPosition, speed, modelMatrix, viewMatrix, projectionMatrix, u_mMatrix, u_vMatrix, u_pMatrix, u_FragColor, a_TexCoord, a_Normal, u_LightX, lightX, u_PointLights, u_PointLightColor, u_PointLightPos, cameraZoom ){


    // Clear <canvas>
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);


    // Update the position for the swinging animation
    var chopperPosition = {
        'x' : rawPosition.x + offsetX,
        'y' : rawPosition.y + offsetY,
        'z' : rawPosition.z + offsetZ
    }

    // Pass the X coordinate of the "fixed" light
    gl.uniform1f( u_LightX, lightX );


    // Pass the location and color of the active bullets
    gl.uniform1f( u_PointLights, bullets.bullets.length );
    if ( bullets.bullets.length > 0 ){
        gl.uniform3fv( u_PointLightPos, bullets.positionInfoArray() );
        gl.uniform3fv( u_PointLightColor, bullets.colorInfoArray() );
    }


    /// Body ///

    modelMatrix.setTranslate(
        chopperPosition.x,
        chopperPosition.y,
        chopperPosition.z
    );
    modelMatrix.rotate( chopperAngle, 0, 1, 0 );
    viewMatrix.setLookAt(20,20,30, 0,0,0, 0,1,0);
    viewMatrix.rotate( cameraPosition.x, 1, 0, 0 );
    viewMatrix.rotate( cameraPosition.y, 0, 1, 0 );
    projectionMatrix.setPerspective(30*cameraZoom,1,1,100);

    // Pass the model, view, projection and rotation matrices
    // to the vertex shader
    gl.uniformMatrix4fv( u_mMatrix, false, modelMatrix.elements);
    gl.uniformMatrix4fv( u_vMatrix, false, viewMatrix.elements);
    gl.uniformMatrix4fv( u_pMatrix, false, projectionMatrix.elements);

    // Pass the color information to the fragment shader
    var r = 0.3;
    var g = ( chopperPosition.x + 10 ) / 20;
    var b = ( chopperPosition.z + 10 ) / 20;
    gl.uniform4f( u_FragColor, r, g, b, 1 );

    // Write the vertex and color coordinates to the buffer object
    if (!initArrayBuffer(gl, buffersInfo.body.vertices, 3, gl.FLOAT, 'a_Position'))
        return -1;

    if (!initArrayBuffer(gl, buffersInfo.body.normals, 3, gl.FLOAT, 'a_Normal'))
        return -1;

    if (!initArrayBuffer(gl, buffersInfo.body.colors, 3, gl.FLOAT, 'a_Color'))
        return -1;

    // Write the indices to the buffer object
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffersInfo.body.indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, buffersInfo.body.indices, gl.STATIC_DRAW);

    // Draw the chopper body
    gl.drawElements(gl.TRIANGLES, buffersInfo.body.indices.length, gl.UNSIGNED_BYTE, 0);


    /// Blades ///

    // We only need to update the extra rotation of the blades,
    // with respect to the body of the chopper,
    // and its scaling from speed
    modelMatrix.rotate( bladeAngle, 0, 1, 0 );
    modelMatrix.scale( speed, 1, (speed+1)/2, 1 );
    gl.uniformMatrix4fv( u_mMatrix, false, modelMatrix.elements);

    gl.uniform4f( u_FragColor, r * 0.95, g * 0.95, b * 0.95, 1 );

    // Write the vertex and color coordinates to the buffer object
    if (!initArrayBuffer(gl, buffersInfo.blades.vertices, 3, gl.FLOAT, 'a_Position'))
        return -1;

    if (!initArrayBuffer(gl, buffersInfo.blades.normals, 3, gl.FLOAT, 'a_Normal'))
        return -1;

    if (!initArrayBuffer(gl, buffersInfo.blades.colors, 3, gl.FLOAT, 'a_Color'))
        return -1;

    // Write the indices to the buffer object
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffersInfo.blades.indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, buffersInfo.blades.indices, gl.STATIC_DRAW);


    // Draw the chopper blades
    gl.drawElements(gl.TRIANGLES, buffersInfo.blades.indices.length, gl.UNSIGNED_BYTE, 0);


    /// Floor ///

    // Write the vertex and color coordinates to the buffer object
    if (!initArrayBuffer(gl, buffersInfo.floor.vertices, 3, gl.FLOAT, 'a_Position'))
        return -1;

    if (!initArrayBuffer(gl, buffersInfo.floor.colors, 3, gl.FLOAT, 'a_Color'))
        return -1;

    // Write the indices to the buffer object
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffersInfo.floor.indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, buffersInfo.floor.indices, gl.STATIC_DRAW);

    gl.uniform4f( u_FragColor, 0.0, 0.0, 0.0, 1 );
    modelMatrix.setTranslate( 0, 0, 0 );
    gl.uniformMatrix4fv( u_mMatrix, false, modelMatrix.elements);
    gl.enableVertexAttribArray(a_TexCoord);
    gl.disableVertexAttribArray( a_Normal );
    gl.drawElements(gl.TRIANGLES, buffersInfo.floor.indices.length, gl.UNSIGNED_BYTE, 0);
    gl.disableVertexAttribArray(a_TexCoord);


    /// Bullets ///

    bullets.update();
    bullets.draw( gl, u_mMatrix, modelMatrix );
}
