

/// Vector3 methods for easier access operations ///

// Scalar multiplication
Vector3.prototype.scale = function( factor ){

    values = new Float32Array( this.elements );
    for ( let i = 0; i < 3; i++ )
        values[i] *= factor;

    return new Vector3( values );
}

// Sum of two vectors component by component
Vector3.sum = function( vector ){

    var returnValues = vector.elements;
    var additionals;

    for ( let i = 1; i < arguments.length; i++ )
        for ( let j = 0; j < 3; j++ )
            returnValues[j] += arguments[i].elements[j];

    return new Vector3( returnValues );
}


/// Distance between two points

function distance( aX, aY, bX, bY ){

    var dX = bX - aX;
    var dY = bY - aY;

    return Math.sqrt( dX * dX + dY * dY );
}


// Log several things, for debugging purposes

function log(){

    var message = '\n';

    for ( let i = 0; i < arguments.length; i++ )
        message += '\t' + arguments[i] + '\n';

    console.log( message );
}



// NxN grid
class Grid{

    constructor( divisions, size = 20 ){


        ////////////
        var img = document.getElementById('image');
        var canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        var context = canvas.getContext('2d');
        context.drawImage(img, 0, 0, img.width, img.height);
        var pixelData = canvas.getContext('2d').getImageData(0, 10, 1, 1).data;
        //canvas.getContext('2d').getImageData(0, 10, 1, 1).data =
        //    new Uint8ClampedArray([ 0, 255, 50, 255 ]);
        //console.log(pixelData);


        ////////////////

        this.size = size;
        this.divisions = divisions;

        this.vertexDims = 3;
        this.texelDims = 2;
        this.colorDims = 3;
        this.indexDims = 6;

        var squares = ( divisions + 1 ) * ( divisions + 1 );
        this.vertices = new Float32Array( squares * this.vertexDims );
        this.texels = new Float32Array( squares * this.texelDims );
        this.colors = new Float32Array( squares * this.colorDims );
        this.normals = new Float32Array( squares );
        // 6 indices (2 triangles) per square,
        // without including last raw and last column vertices
        this.indices = new Uint8Array( divisions * divisions * this.indexDims );

        var current;
        var color;

        // Color of each corner of the curface
        var center = new Vector3([ 0.5, 0.1, 0.3 ]);
        var topLeft = new Vector3([ 0.5, 0.5, 0.9 ]);
        var topRight = new Vector3([ 0.5, 0.9, 0.5 ]);
        var bottomLeft = new Vector3([ 0.9, 0.5, 0.5 ]);
        var bottomRight = new Vector3([ 0.9, 0.9, 0.5 ]);
        // Distances to calculate their interpolations.
        // They'll be used later on as their inverse,
        // so that a closer position returns a higher value
        var distanceFromC;
        var distanceFromTL;
        var distanceFromTR;
        var distanceFromBL;
        var distanceFromBR;

        // Variables to store indices values, for readability
        var a, b, c, d;

        // Set the values for the vertices on the grid
        for ( let i = 0; i < divisions + 1; i++ )
            for ( let j = 0; j < divisions + 1; j++ ){

                // Vertex position (without taking height into account)
                current =
                    i * (divisions+1) * this.vertexDims + j * this.vertexDims;
                this.vertices[current] = 1.0 * i / divisions;
                this.vertices[current+1] = 0.0;
                this.vertices[current+2] = 1.0 * j / divisions;

                // Texel position
                current =
                    i * (divisions+1) * this.texelDims + j * this.texelDims;
                this.texels[current] = 1.0 * i / divisions;
                this.texels[current+1] = 1.0 - 1.0 * j / divisions;

                // Color position
                current =
                    i * (divisions+1) * this.colorDims + j * this.colorDims;

                // The longest distance taken into account is 1.
                // Above 1, al distances are truncated to 1.
                // And 0.5 for the color in the center of the grid
                distanceFromC = Math.min(
                    distance( i, j, divisions/2, divisions/2 ) / divisions,
                    0.5 );
                distanceFromTL = Math.min(
                    distance( i, j, 0, 0 ) / divisions,
                    1 );
                distanceFromTR = Math.min(
                    distance( i, j, 0, divisions ) / divisions,
                    1 );
                distanceFromBL = Math.min(
                    distance( i, j, divisions, 0 ) / divisions,
                    1 );
                distanceFromBR = Math.min(
                    distance( i, j, divisions, divisions ) / divisions,
                    1 );

                color = Vector3.sum(
                    center.scale( ( 0.5 - distanceFromC ) * 2 ),
                    topLeft.scale( 1 - distanceFromTL ),
                    topRight.scale( 1 - distanceFromTR ),
                    bottomLeft.scale( 1 - distanceFromBL ),
                    bottomRight.scale( 1 - distanceFromBR )
                );

                //console.log(color.elements);
                //console.log( "Distances: " + distanceFromTL + " " + distanceFromTR + " " + distanceFromBL + " " + distanceFromBR )

                this.colors[current] = color.elements[0];
                this.colors[current+1] = color.elements[1];
                this.colors[current+2] = color.elements[2];

                // Triangle indices

                // The last column and last raw are not considered,
                // since there's nothing to link them to
                if ( i >= divisions || j >= divisions )
                    continue;

                current =
                    i * divisions * this.indexDims + j * this.indexDims;

                /*
                A ------- C
                |       / |
                |     /   |
                |   /     |
                | /       |
                B ------- D

                A, current vertex: i, j
                B, next vertex in same column: i, j + 1
                C, next vertex in same raw: i + 1, j
                D, next vertex in C's column: i + 1, j + 1

                We add the triangles ABC and BDC
                */

                a = i * ( divisions + 1 ) + j;
                b = i * ( divisions + 1 ) + j + 1;
                c = ( i + 1 ) * ( divisions + 1 ) + j;
                d = ( i + 1 ) * ( divisions + 1 ) + j + 1;

                this.indices[current] = a;
                this.indices[current+1] = b;
                this.indices[current+2] = c;
                this.indices[current+3] = b;
                this.indices[current+4] = d;
                this.indices[current+5] = c;

                //log( 'current:', current, 'i:', i, 'j:', j, a, b, c, d, this.indices );
            }

        // Scale the grid and center around origin
        for ( let i = 0; i < this.vertices.length; i += 3 ){
            // Scaling
            this.vertices[i] *= this.size;
            this.vertices[i+1] *= this.size;
            this.vertices[i+2] *= this.size;
            // Translation
            this.vertices[i] -= this.size / 2;
            this.vertices[i+2] -= this.size / 2;
        }

        var heights = new Float32Array(squares);
        for ( let i = 0; i < heights.length; i++){
            heights[i] = canvas.getContext('2d')
                .getImageData(this.texels[i*2]*99, this.texels[i*2+1]*99, 1, 1).data[0] / 255.0;
            //log( this.texels[i*2]*99, this.texels[i*2+1]*99, heights[i] );
        }

        //console.log( heights );

        //log( this.vertices[0], this.vertices[1], this.vertices[0] );
        //log( this.vertices[squares * this.vertexDims-3], this.vertices[squares * this.vertexDims-2], this.vertices[squares * this.vertexDims-1])
    }
}


// Mesh that will be rendered for the bullets
class BulletMesh{

    constructor( x, z, gl ){

        /*
               v0
             /  | \
            /   |  \
           /   v3   \
          /  / |  \  \
         / /   |    \ \
        v1-----------v2
          \    |   /
            \  | /
              v4
        */
        this.vertices = new Float32Array([
            0.0, 0.3, 0.0,
            -0.25, 0.1, 0.15,
            0.25, 0.1, 0.15,
            0.0, 0.1, -0.15,
            0.0, -0.1, 0.0
        ]);

        this.indices = new Uint8Array([
            // up
            0, 1, 2,
            0, 2, 3,
            0, 3, 1,
            // down
            1, 4, 2,
            2, 4, 3,
            3, 4, 1
        ]);

        this.r = 0.3;
        this.g = ( x + 10.0 ) / 20.0 * 1.2;
        this.b = ( z + 10.0 ) / 20.0 * 1.2;
        this.colors = new Float32Array([
            this.r, this.g, this.b,
            this.r, this.g, this.b,
            this.r, this.g, this.b,
            this.r, this.g, this.b,
            this.r, this.g, this.b,
            this.r, this.g, this.b
        ]);

        console.log('gl:');
        console.log(gl);
        this.indexBuffer = gl.createBuffer();
        if ( this.indexBuffer ){
            console.log('Failed to create a buffer object');
            console.log( this.indexBuffer );
            return -1;
        }
    }
}


// Light bullets that the chopper can fire
class Bullet{

    constructor( position, angleRadians, gl ){

        // Current position
        this.x = position.x;
        this.y = position.y;
        this.z = position.z;

        this.mesh = new BulletMesh( position.x, position.z, gl );

        // Position change in X and Z in each frame
        var angle = angleRadians * Math.PI / 180.0;
        this.increaseX = Math.sin( angle );
        this.increaseZ = Math.cos( angle );

        // Movement model variables
        this.horizontalSpeed = 0.2;
        this.verticalSpeed =  0.22;
        this.horitontalFriction = 0.001;
        this.verticalAcceleration = -0.01;

        log( this.increaseX, this.increaseZ );
    }

    // Returns the bullet's position, to delete the object if it goes too low
    update(){

        if ( this.horizontalSpeed > 0.0 )
            this.horizontalSpeed -= this.horitontalFriction;
        this.verticalSpeed += this.verticalAcceleration;

        this.x += this.increaseX * this.horizontalSpeed;
        this.y += this.verticalSpeed;
        this.z += this.increaseZ * this.horizontalSpeed;

        return this.y >= 0.0;
    }

    // Render the mesh in the screen
    draw( gl, u_mMatrix, modelMatrix ){

        if (!initArrayBuffer(gl, this.mesh.vertices, 3, gl.FLOAT, 'a_Position'))
            return -1;
        if (!initArrayBuffer(gl, this.mesh.colors, 3, gl.FLOAT, 'a_Color'))
            return -1;
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.mesh.indexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.mesh.indices, gl.STATIC_DRAW);

        modelMatrix.setTranslate( this.x, this.y, this.z );
        gl.uniformMatrix4fv( u_mMatrix, false, modelMatrix.elements);

        gl.drawElements(gl.TRIANGLES, this.mesh.indices.length, gl.UNSIGNED_BYTE, 0);
    }
}


// Bullet container
class Bullets{

    constructor(){

        this.bullets = [];
    }

    length(){

        return this.bullets.length();
    }

    // Add a new bullet at the end of the stored array
    add( bullet ){

        this.bullets[this.bullets.length] = bullet;
    }

    // Update positions and remove elements below the XZ plane
    update(){

        var i = 0;
        while ( i < this.bullets.length )
            if ( !this.bullets[i].update() )
                this.bullets.splice( i, 1 );
            else
                i++;
    }

    // Draw all the stored elements
    draw( gl, u_mMatrix, modelMatrix ){

        for ( let i = 0; i < this.bullets.length; i++ )
            this.bullets[i].draw( gl, u_mMatrix, modelMatrix );
    }


    // Information arrays generation for the vertex shader

    positionInfoArray(){

        var info = new Float32Array(
            this.bullets.length > 0 ?
            this.bullets.length * 3 :
            3
        );

        for ( let i = 0; i < this.bullets.length; i++ ){
            info[i*3] = this.bullets[i].x;
            info[i*3+1] = this.bullets[i].y;
            info[i*3+2] = this.bullets[i].z;
        }

        return info;
    }

    colorInfoArray(){

        var info = new Float32Array(
            this.bullets.length > 0 ?
            this.bullets.length * 3 :
            3
        );

        for ( let i = 0; i < this.bullets.length; i++ ){
            info[i*3] = this.bullets[i].mesh.r;
            info[i*3+1] = this.bullets[i].mesh.g;
            info[i*3+2] = this.bullets[i].mesh.b;
        }

        return info;
    }
}
