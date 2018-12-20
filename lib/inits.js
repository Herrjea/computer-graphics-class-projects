function initVertexBuffers(gl) {


    var body = {};
    var blades = {};
    var floor = {};
    var floorData = new Grid(15);


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
        0.8, 0.8, 1.0,
        1.0, 1.0,-1.0,
        -1.0, 1.0,-1.0,
        -0.8, 0.8, 1.0,
        // v4-v5-v6-v7 down
        -1.0,-1.0,-1.0,
        1.0,-1.0,-1.0,
        0.8,-0.8, 1.0,
        -0.8,-0.8, 1.0
    ]);

    // Blades:
    //    v3--------------- v1
    //   /                  /
    //  v2----------------v0

    blades.vertices = new Float32Array([
        2.5,1.15,0.2,
        2.5,1.15,-0.2,
        -2.5,1.15,0.2,
        -2.5,1.15,-0.2
    ]);

    // The floor is a grid of NxN squares, each with two triangles,
    // procedurally generated

    floor.vertices = floorData.vertices;


    /// Color coordinates ///

    body.colors = new Float32Array([
        // up (darker)
        0.8, 0.8, 0.8,
        0.8, 0.8, 0.8,
        0.8, 0.8, 0.8,
        0.8, 0.8, 0.8,
        // down (lighter)
        1.0, 1.0, 1.0,
        1.0, 1.0, 1.0,
        1.0, 1.0, 1.0,
        1.0, 1.0, 1.0
    ]);

    blades.colors = new Float32Array([
        0.55, 0.55, 0.55,  0.55, 0.55, 0.55,
        0.55, 0.55, 0.55,  0.55, 0.55, 0.55
    ]);

    floor.colors = floorData.colors;


    /// Indices tables ///

    body.indices = new Uint8Array([
        0, 3, 7,   0, 7, 6,    // front
        0, 6, 1,   1, 6, 5,    // right
        2, 3, 0,   1, 2, 0,    // up
        2, 7, 3,   2, 4, 7,    // left
        4, 6, 7,   4, 6, 5,    // down
        1, 4, 2,   1, 5, 4     // back
    ]);

    blades.indices = new Uint8Array([
        0,1,3,   3,2,0
    ]);

    floor.indices = floorData.indices;


    /// Texture coordinates for the floor ///

    var floorTexCoords = floorData.texels;


    /// Create the buffer objects ///

    body.indexBuffer = gl.createBuffer();
    blades.indexBuffer = gl.createBuffer();
    floor.indexBuffer = gl.createBuffer();
    var texCoordBuffer = gl.createBuffer();

    if ( !body.indexBuffer || !blades.indexBuffer || !floor.indexBuffer || !texCoordBuffer ){
        console.log('Failed to create a buffer object');
        return -1;
    }

    // Send the vertex shader the information about
    // where neighbour vertices can be found
    var u_Step = gl.getUniformLocation(gl.program, 'u_Step');
    if (!u_Step) {
        console.log('Failed to get the storage location of u_Step');
        return false;
    }
    gl.uniform1f( u_Step, 1.0 / floorData.divisions );

    /*
        Different objects are stored in different buffers,
        which are changed during render time.
        It doesn't allow for hardware acceleration this way,
        since JavaScript is doing the job, but I found
        no other way so far to use drawElements, this is,
        to use indices tables, to make several drawing calls
        for the different objects in the scene.

        But the texture coordinates buffer doesn't change
        throughout the execution.
    */

    gl.bindBuffer( gl.ARRAY_BUFFER, texCoordBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, floorTexCoords, gl.STATIC_DRAW );

    // Get the storage location of a_TexCoord
    var a_TexCoord = gl.getAttribLocation(gl.program, 'a_TexCoord');
    if (a_TexCoord < 0) {
      console.log('Failed to get the storage location of a_TexCoord');
      return -1;
    }
    // Assign the buffer object to a_TexCoord variable
    gl.vertexAttribPointer( a_TexCoord, 2, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( a_TexCoord );  // Enable the assignment of the buffer object


    var buffers = {};
        buffers.body = body;
        buffers.blades = blades;
        buffers.floor = floor;

    return buffers;
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



function initTextures( gl, source ){


    texture = gl.createTexture();   // Create a texture object
    if ( !texture ) {
        console.log('Failed to create the texture object');
        return false;
    }

    // Get the storage location of u_Sampler
    var u_Sampler = gl.getUniformLocation(gl.program, 'u_Sampler');
    if (!u_Sampler) {
        console.log('Failed to get the storage location of u_Sampler');
        return false;
    }

    // Create the image object
    var image = new Image();
    if (!image) {
        console.log('Failed to create the image object');
        return false;
    }
    console.log('texture:');
    console.log(texture);
    image.crossOrigin = '';

    // Register the event handler to be called on loading an image
    image.onload = function(){
        loadTexture( gl, texture, u_Sampler, image );
    };
    // Tell the browser to load an image
    image.src = source;

    return true;
}
