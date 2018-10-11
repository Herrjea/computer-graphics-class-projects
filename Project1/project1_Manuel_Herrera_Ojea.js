// Project #1. Manuel Herrera Ojea

/*

Falta:

    Shaders a archivos aparte
    Textura para el triángulo

*/

// Vertex shader program
var VSHADER_SOURCE =
    'attribute vec4 a_Position;\n' +
    'uniform mat4 u_ModelMatrix;\n' +
    'void main() {\n' +
    '  gl_Position = u_ModelMatrix * a_Position;\n' +
    '}\n';


// Fragment shader program
var FSHADER_SOURCE =
    'precision mediump float;\n' +
    'uniform vec4 u_FragColor;\n' +
    'void main() {\n' +
    '  gl_FragColor = u_FragColor;\n' +
    '}\n';


// Rotation angle (degrees/second)
var ANGLE_STEP = 45.0;


// Controller keys
var fwdAccKey = 'KeyX';
var bwdAccKey = 'KeyZ';
var rightTurnKey = 'ArrowRight';
var leftTurnKey = 'ArrowLeft';


function main() {

    // Retrieve <canvas> element
    var canvas = document.getElementById('webgl');

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

    // Write the positions of vertices to a vertex shader
    var n = initVertexBuffers(gl);
    if (n < 0) {
        console.log('Failed to set the positions of the vertices');
        return;
    }

    // Get the storage location of u_FragColor
    var u_FragColor = gl.getUniformLocation( gl.program, 'u_FragColor' );
    if (!u_FragColor) {
        console.log('Failed to get the storage location of u_FragColor');
        return;
    }

    // Specify the color for clearing <canvas>
    gl.clearColor(0.0, 0.0, 0.0, 1.0);


    // Get storage location of u_ModelMatrix
    var u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
    if (!u_ModelMatrix) {
        console.log('Failed to get the storage location of u_ModelMatrix');
        return;
    }


    // Current chopper rotation angle
    var chopperAngle = 0.0;
    var currentAngle = 0.0; //////////////////////////

    // Current chopper position
    var chopperPosition = {
        'x' : 0.0,
        'y' : 0.0
    };

    // Chopper linear speed
    var chopperLinearSpeed = 0;
    var chopperLinearAcceleration = 0.002;
    var chopperLinearFriction = 0.001;
    var chopperMaxLinearSpeed = 0.03;

    // Chopper angular speed
    var chopperAngularSpeed = 0.0;
    var chopperAngularAcceleration = 0.8;
    var chopperAngularFriction = 0.6;
    var chopperMaxAngularSpeed = 7.0;

    // Current blade rotation
    var bladeAngle = 0.0;
    var bladeSpeed = 5.0;
    var bladeBaseSpeed = 5.0;
    var bladeMaxSpeed = 40.0;
    var bladeAcceleration = 5.0;
    var bladeFriction = 1.0;

    var threshold = chopperLinearFriction;

    // Model matrix
    var modelMatrix = new Matrix4();

    var accelerating = false;
    var decelerating = false;
    var turningRight = false;
    var turningLeft = false;



    document.addEventListener( 'keydown', function(e){

        if ( e.code == fwdAccKey )
            accelerating = true;
        else if ( e.code == bwdAccKey )
            decelerating = true;
        else if ( e.code == rightTurnKey )
            turningRight = true;
        else if ( e.code == leftTurnKey )
            turningLeft = true;

        console.log( e.code + ' pressed.' );

    } );

    document.addEventListener( 'keyup', function(e){
        if ( e.code == fwdAccKey )
            accelerating = false;
        else if ( e.code == fwdAccKey )
            decelerating = false;
        else if ( e.code == rightTurnKey )
            turningRight = false;
        else if ( e.code == leftTurnKey )
            turningLeft = false;

        console.log( e.code + ' released.' );
    });


    // Start drawing

    var tick = function() {

        // Update properties based on movement model
        currentAngle = animate(currentAngle);

        // Update linear speed
        if ( accelerating && chopperLinearSpeed < chopperMaxLinearSpeed )
            chopperLinearSpeed += chopperLinearAcceleration;
        else if ( chopperLinearSpeed > 0 )
            chopperLinearSpeed -= chopperLinearFriction;
        console.log( chopperLinearSpeed );

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

        //chopperAngle = ( chopperAngle + chopperAngularSpeed ) % 360;
        chopperAngle += chopperAngularSpeed;
        console.log( '\t\t\tAngular speed: ' + chopperAngularSpeed );
        console.log( 'Moving to ' + ( chopperAngle % 360 ) + ' degrees' );

        if ( ! accelerating && chopperLinearSpeed < chopperLinearAcceleration )
            chopperLinearSpeed = 0.0;
        //else if ( chopperLinearSpeed <= threshold && chopperLinearSpeed >= (-threshold) )
        //    chopperLinearSpeed = 0.0;

        // Convert to radians for Math libraries
        var angle = chopperAngle * Math.PI / 180.0;
        console.log( '\t\t\t\t' + angle );
        chopperPosition.x += Math.sin( angle ) * chopperLinearSpeed;
        chopperPosition.y -= Math.cos( -angle ) * chopperLinearSpeed;
        console.log(chopperPosition);

        // Update blades angle
        if ( accelerating ){
            if ( bladeSpeed < bladeMaxSpeed )
                bladeAngle += bladeAcceleration;
        }
        else if ( bladeSpeed > bladeBaseSpeed )
            bladeSpeed -= bladeFriction;
        bladeAngle += bladeSpeed;

        // Draw the chopper
        draw(
            gl, n, chopperAngle, bladeAngle, chopperPosition, 1+chopperLinearSpeed*15,
            modelMatrix, u_ModelMatrix, u_FragColor
        );

        // Request that the browser calls tick
        requestAnimationFrame(tick, canvas);
    };

    tick();
}


function initVertexBuffers(gl) {

    // Shape ertices
    var vertices = new Float32Array ([
        0.0, -0.15,      -0.1, 0.05,      0.1, 0.05,   // triangle
        -0.1, 0.005,     -0.1, -0.005,    0.1, 0.005,  // blades
        -0.1, -0.005,    0.1, -0.005,     0.1, 0.005   // blades
    ]);
    var n = 9;


    // Create the buffer object
    var vertexBuffer = gl.createBuffer();
    if (!vertexBuffer) {
        console.log('Failed to create the triangle buffer object');
        return -1;
    }

    // Bind the buffer object to target
    gl.bindBuffer( gl.ARRAY_BUFFER, vertexBuffer );
    // Write date into the buffer object
    gl.bufferData( gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW );

    // Assign the buffer object to a_Position variable
    var a_Position = gl.getAttribLocation(gl.program, 'a_Position');
    if(a_Position < 0) {
        console.log('Failed to get the storage location of a_Position');
        return -1;
    }
    gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, 0, 0);

    // Enable the assignment to a_Position variable
    gl.enableVertexAttribArray(a_Position);

    return n;
}


function draw( gl, n, chopperAngle, bladeAngle, chopperPosition, speed,
    modelMatrix, u_ModelMatrix, u_FragColor ){

    // Clear <canvas>
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Set the triangle rotation matrix
    modelMatrix.setTranslate( chopperPosition.x, chopperPosition.y, 0 );
    //var angle = chopperAngle / Math.PI * 180.0;
    modelMatrix.rotate( chopperAngle, 0, 0, 1 );
    console.log( 'Rotating ' + ( chopperAngle % 360 ) + ' degrees' );
    //console.log( 'Rotating ' + ( ( chopperAngle * 180.0 / Math.PI ) % 360 ) + ' degrees' );

    // Pass the triangle rotation matrix to the vertex shader
    gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);

    // Pass the triangle color information to the fragment shader
    var r = 0.3;
    var g = ( chopperPosition.x + 1 ) / 2;
    var b = ( chopperPosition.y + 1 ) / 2;
    gl.uniform4f( u_FragColor, r, g, b, 1 );

    // Draw the triangle
    gl.drawArrays( gl.TRIANGLES, 0, 3 );

    // Repeat process, this time for the blades
    modelMatrix.setTranslate( chopperPosition.x, chopperPosition.y, 0 );
    modelMatrix.rotate( chopperAngle + bladeAngle, 0, 0, 1 );
    modelMatrix.scale( speed, (speed+1)/2, 1, 1 );
    //modelMatrix.rotate( bladeAngle, 0, 0, 1 );
    gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
    gl.uniform4f( u_FragColor, (r+1)/2, (g+1)/2, (b+1)/2, 1 );

    // Draw the blades
    gl.drawArrays( gl.TRIANGLES, 3, 6 );
}


// Last time that this function was called
var g_last = Date.now();

function animate(angle) {

  // Calculate the elapsed time
  var now = Date.now();
  var elapsed = now - g_last;
  g_last = now;

  // Update the current rotation angle (adjusted by the elapsed time)
  var newAngle = angle + (ANGLE_STEP * elapsed) / 1000.0;

  return newAngle %= 360;
}
