/*

textura
vertical sinusoidal offset =D

*/



// Vertex shader program
var VSHADER_SOURCE =
    'attribute vec4 a_Position;\n' +
    'attribute vec4 a_Color;\n' +
    'uniform mat4 u_mMatrix;\n' +
    'uniform mat4 u_vMatrix;\n' +
    'uniform mat4 u_pMatrix;\n' +
    'varying vec4 v_Color;\n' +
    'varying float v_Colored;\n' +
    'void main() {\n' +
    '  gl_Position = u_pMatrix * u_vMatrix * u_mMatrix * a_Position;\n' +
    '  v_Color = a_Color;\n' +
    '  if ( a_Position.y > 0.7 )\n' +
    '    v_Colored = 1.0;\n' +
    '  else\n' +
    '    v_Colored = -1.0;\n' +
    '  v_Colored = a_Position.y;\n' +
    '}\n';

// Fragment shader program
var FSHADER_SOURCE =
    '#ifdef GL_ES\n' +
    'precision mediump float;\n' +
    '#endif\n' +
    'uniform vec4 u_FragColor;\n' +
    'varying vec4 v_Color;\n' +
    'varying float v_Colored;\n' +
    'float rate;\n' +
    'void main() {\n' +
    '  if ( u_FragColor.r == 0.0 )\n' +
    '    gl_FragColor = v_Color;\n' +
    '  else {\n' +
    '    rate = (v_Colored + 1.0) / 2.0;\n' +
    '    if ( rate > 1.0 )\n' +
    '      rate = 1.0;\n' +
    '    else if ( rate < -1.0 )\n' +
    '      rate = -1.0;\n' +
    '    gl_FragColor = mix( v_Color, u_FragColor, pow(rate,1.7) );\n' +
    '  }\n' +
//    '  else\n' +
//    '   gl_FragColor = v_Color;\n' +
    '}\n';


// Controller keys
var fwdAccKey = 'ArrowUp';
var bwdAccKey = 'ArrowDown';
var rightTurnKey = 'ArrowRight';
var leftTurnKey = 'ArrowLeft';
var uwdAccKey = 'KeyW';
var dwdAccKey = 'KeyS';


// Print state during execution
var debug = false;


// Screen dimensions to render two different viewports
var width;
var height;



function main() {


    // Retrieve <canvas> element
    var canvas = document.getElementById('webgl');
    width = canvas.width;
    height = canvas.height;

    // Get the rendering context for WebGL
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


    // Matrices passed to the vertex shader
    var modelMatrix = new Matrix4();
    var viewMatrix = new Matrix4();
    var projectionMatrix = new Matrix4();


    // Current chopper rotation angle
    var chopperAngle = 0.0;

    // Current chopper position
    var chopperPosition = {
        'x' : 0.0,
        'y' : 0.0,
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
    var bladeSpeed = 5.0;
    var bladeBaseSpeed = 5.0;
    var bladeMaxSpeed = 40.0;
    var bladeAcceleration = 5.0;
    var bladeFriction = 1.0;

    // State control variables
    var accelerating = false;
    var decelerating = false;
    var ascending = false;
    var descending = false;
    var turningRight = false;
    var turningLeft = false;


    // Change state depending on key presses
    document.addEventListener( 'keydown', function(e){

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

        // Update properties based on movement model

        // Update horizontal linear speed
        /*if ( accelerating && chopperHorizontalLinearSpeed < chopperMaxHorizontalLinearSpeed )
            chopperHorizontalLinearSpeed += chopperHorizontalLinearAcceleration;
        else if ( chopperHorizontalLinearSpeed > 0 )
            chopperHorizontalLinearSpeed -= chopperHorizontalLinearFriction;*/
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

        // Clip to zero to prevent shivering because of float precision errors
        if ( ! accelerating && chopperHorizontalLinearSpeed < chopperHorizontalLinearAcceleration )
            chopperLinearSpeed = 0.0;

        // Convert to radians for Math libraries
        var angle = chopperAngle * Math.PI / 180.0;
        // Update chopper position
        chopperPosition.x += Math.sin( angle ) * chopperHorizontalLinearSpeed;
        chopperPosition.y += chopperVerticalLinearSpeed;
        chopperPosition.z += Math.cos( angle ) * chopperHorizontalLinearSpeed;

        // Update blades angle
        if ( accelerating ){
            if ( bladeSpeed < bladeMaxSpeed )
                bladeAngle += bladeAcceleration;
        }
        else if ( bladeSpeed > bladeBaseSpeed )
            bladeSpeed -= bladeFriction;
        bladeAngle += bladeSpeed;


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
            gl, buffersInfo, chopperAngle, bladeAngle, chopperPosition, 1+chopperHorizontalLinearSpeed*15,
            modelMatrix, viewMatrix, projectionMatrix,
            u_mMatrix, u_vMatrix, u_pMatrix, u_FragColor
        );


        //gl.drawElements(gl.TRIANGLES, n, gl.UNSIGNED_BYTE, 0);

        // Request that the browser calls tick
        requestAnimationFrame(tick, canvas);
    };

    tick();


    // Draw the cube
    //gl.drawElements(gl.TRIANGLES, n, gl.UNSIGNED_BYTE, 0);
}

function initVertexBuffers(gl) {


    var body = {};
    var blades = {};
    var floor = {};

    /// Vertex coordinates ///


    // Cube:
    //    v2----- v1
    //   /|      /|
    //  v3------v0|
    //  | |     | |
    //  | |v4---|-|v5
    //  |/      |/
    //  v7------v6

    body.vertices = new Float32Array([
        // v0-v1-v2-v3 up
        0.8, 0.8, 1.0,  1.0, 1.0,-1.0,  -1.0, 1.0,-1.0,     -0.8, 0.8, 1.0,
        // v4-v5-v6-v7 down
        -1.0,-1.0,-1.0, 1.0,-1.0,-1.0,  0.8,-0.8, 1.0,      -0.8,-0.8, 1.0
    ]);

    // Blades:
    //    v3--------------- v1
    //   /                  /
    //  v2----------------v0

    blades.vertices = new Float32Array([
        2.5,1.15,0.2,    2.5,1.15,-0.2,   -2.5,1.15,0.2,    -2.5,1.15,-0.2
    ]);

    // Floor:
    //        v0--------------- v1
    //       /  \           /    /
    //      /     \      /      /
    //     /        v4         /
    //    /     /      \      /
    //   /   /           \   /
    //  v2-----------------v3

    floor.vertices = new Float32Array([
        // corners
        -10.0,-2.0,-10.0,   10.0,-2.0,-10.0,
        -10.0,-2.0,10.0,    10.0,-2.0,10.0,
        //center
        0.0,-2.0,0.0
    ]);


    /// Color coordinates ///


    body.colors = new Float32Array([
        // up (darker)
        0.8, 0.8, 0.8,  0.8, 0.8, 0.8,  0.8, 0.8, 0.8,  0.8, 0.8, 0.8,
        // down (lighter)
        1.0, 1.0, 1.0,  1.0, 1.0, 1.0,  1.0, 1.0, 1.0,  1.0, 1.0, 1.0
    ]);

    blades.colors = new Float32Array([
        0.55, 0.55, 0.55,  0.55, 0.55, 0.55,
        0.55, 0.55, 0.55,  0.55, 0.55, 0.55
    ]);

    floor.colors = new Float32Array([
        0.5,0.5,0.9,    0.5,0.9,0.5,    0.9,0.5,0.5,    0.9,0.9,0.5,
        1.0,1.0,1.0
    ]);


    /// Indices table ///


    body.indices = new Uint8Array([
        0, 3, 7,   0, 7, 6,    // front
        0, 6, 1,   1, 6, 5,    // right
        2, 3, 0,   1, 2, 0,    // up
        2, 7, 3,   2, 4, 7,    // left
        4, 6, 7,   4, 5, 5,    // down
        1, 4, 2,   1, 5, 4     // back
    ]);

    blades.indices = new Uint8Array([
        0,1,3,   3,2,0
    ]);

    floor.indices = new Uint8Array([
        0,1,4,   0,2,4,   2,3,4,   3,1,4
    ]);


    /// Create the buffer objects ///

    body.indexBuffer = gl.createBuffer();
    blades.indexBuffer = gl.createBuffer();
    floor.indexBuffer = gl.createBuffer();
    if ( !body.indexBuffer || !blades.indexBuffer || !floor.indexBuffer )
        return -1;


    /*
        Different objects are stored in different buffers,
        which are changed during render time.
        It doesn't allow for hardware acceleration this way,
        since JavaScript is doing the job, but I found
        no other way so far to use drawElements, this is,
        to use indices tables, to make several drawing calls.
    */

    /*// Write the vertex and color coordinates to the buffer objects
    if (!initArrayBuffer(gl, vertices, 3, gl.FLOAT, 'a_Position'))
        return -1;

    if (!initArrayBuffer(gl, colors, 3, gl.FLOAT, 'a_Color'))
        return -1;

    // Write the indices to the buffer object
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);*/

    var ret = {};
        ret.body = body;
        ret.blades = blades;
        ret.floor = floor;

    return ret;
}


function initArrayBuffer(gl, data, num, type, attribute) {

    var buffer = gl.createBuffer();   // Create a buffer object
    if (!buffer) {
        console.log('Failed to create the buffer object');
        return false;
    }

    // Write date into the buffer object
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    // Assign the buffer object to the attribute variable
    var a_attribute = gl.getAttribLocation(gl.program, attribute);
    if (a_attribute < 0) {
        console.log('Failed to get the storage location of ' + attribute);
        return false;
    }
    gl.vertexAttribPointer(a_attribute, num, type, false, 0, 0);
    // Enable the assignment of the buffer object to the attribute variable
    gl.enableVertexAttribArray(a_attribute);

    return true;
}


function draw( gl, buffersInfo, chopperAngle, bladeAngle, chopperPosition, speed,
    modelMatrix, viewMatrix, projectionMatrix, u_mMatrix, u_vMatrix, u_pMatrix, u_FragColor ){


    // Clear <canvas>
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);


    // Begin drawing for the left camera only
    gl.viewport( 0, 0, width/2, height );


    /// Body ///

    modelMatrix.setTranslate(
        chopperPosition.x,
        chopperPosition.y,
        chopperPosition.z
    );
    modelMatrix.rotate( chopperAngle, 0, 1, 0 );
    viewMatrix.setLookAt(20,20,30, 0,0,0, 0,1,0);
    projectionMatrix.setPerspective(30,1,1,100);


    // Pass the model view projection matrices to the shaders
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

    if (!initArrayBuffer(gl, buffersInfo.body.colors, 3, gl.FLOAT, 'a_Color'))
        return -1;

    // Write the indices to the buffer object
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffersInfo.body.indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, buffersInfo.body.indices, gl.STATIC_DRAW);


    // Draw the chopper body
    gl.drawElements(gl.TRIANGLES, buffersInfo.body.indices.length, gl.UNSIGNED_BYTE, 0);


    /// Blades ///

    // We only need to update the extra rotation of the blades,
    // with respect to the body of the chopper
    modelMatrix.rotate( bladeAngle, 0, 1, 0 );
    gl.uniformMatrix4fv( u_mMatrix, false, modelMatrix.elements);

    gl.uniform4f( u_FragColor, r * 0.95, g * 0.95, b * 0.95, 1 );

    // Write the vertex and color coordinates to the buffer object
    if (!initArrayBuffer(gl, buffersInfo.blades.vertices, 3, gl.FLOAT, 'a_Position'))
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

    // Left camera
    gl.uniform4f( u_FragColor, 0.0, 0.0, 0.0, 1 );
    modelMatrix.setTranslate( 0, 0, 0 );
    gl.uniformMatrix4fv( u_mMatrix, false, modelMatrix.elements);
    gl.drawElements(gl.TRIANGLES, buffersInfo.floor.indices.length, gl.UNSIGNED_BYTE, 0);

    // Right camera
    gl.viewport( width/2, 0, width/2, height );
    modelMatrix.rotate( -90, 1, 0, 0 );
    modelMatrix.rotate( -chopperAngle, 0, 1, 0 );
    modelMatrix.translate(
        -chopperPosition.x,
        chopperPosition.y,
        -chopperPosition.z
    );
    //modelMatrix.rotate( 180, 0, 1, 0 );
    viewMatrix.setLookAt(
        // eye
        0.0,0.0,5.0,
        // at
        0.0,-1.0,0.0,
        // up
        0,1,0
    );
    gl.uniformMatrix4fv( u_mMatrix, false, modelMatrix.elements);
    gl.uniformMatrix4fv( u_vMatrix, false, viewMatrix.elements);
    gl.drawElements(gl.TRIANGLES, buffersInfo.floor.indices.length, gl.UNSIGNED_BYTE, 0);

    /*
    viewMatrix.setLookAt(
        // eye
        0.0,0.0,0.0,
        // at
        0.0,1.0,0.0,
        // up
        0,0,1
    );
    viewMatrix.rotate( chopperAngle, 0, 1, 0 );
    viewMatrix.translate(-chopperPosition.x,chopperPosition.y,-chopperPosition.z);
    */

    /* viewMatrix.setLookAt(
        // eye
        chopperPosition.x,
        chopperPosition.y,
        chopperPosition.z,
        // at
        chopperPosition.x,
        chopperPosition.y - 1,
        chopperPosition.z,
        // up
        0,0,1
    );
    */




    // Draw the triangle
    //gl.drawArrays( gl.TRIANGLES, 0, 3 );

    // Repeat process, this time for the blades
    modelMatrix.setTranslate( chopperPosition.x, chopperPosition.y, 0 );
    modelMatrix.rotate( chopperAngle + bladeAngle, 0, 0, 1 );
    modelMatrix.scale( speed, (speed+1)/2, 1, 1 );
    //gl.uniformMatrix4fv(u_MvpMatrix, false, modelMatrix.elements);
    //gl.uniform4f( u_FragColor, (r+1)/2, (g+1)/2, (b+1)/2, 1 );

    // Draw the blades
    //gl.drawElements(gl.TRIANGLES, indices.total, gl.UNSIGNED_BYTE, 0);
    //gl.drawArrays( gl.TRIANGLES, 3, 6 );
}
