



function loadTexture( gl, texture, u_Sampler, image ){


    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1); // Flip the image's y axis
    // Enable texture unit0
    gl.activeTexture(gl.TEXTURE0);
    // Bind the texture object to the target
    gl.bindTexture(gl.TEXTURE_2D, texture);

    // Set the texture parameters
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    // Set the texture image
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);

    //console.log('texImage2D');
    //console.log(image);
    //console.log('textura tras ello:');
    //console.log(texture);

    // Set the texture unit 0 to the sampler
    gl.uniform1i(u_Sampler, 0);
}


function modifyTexture( gl, texture, bullets ){

    //console.log( texture );

    var framebuffer = gl.createFramebuffer();
    gl.bindFramebuffer( gl.FRAMEBUFFER, framebuffer) ;
    gl.framebufferTexture2D(
        gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0 );
    var width = 1024, height = 1024;

    if ( gl.checkFramebufferStatus(gl.FRAMEBUFFER) == gl.FRAMEBUFFER_COMPLETE ){
        var textureSize = width * height * 4;    // r, g, b, a
        var pixels = new Uint8Array( textureSize );
        gl.readPixels(
            0, 0,
            width, height,
            gl.RGBA,gl.UNSIGNED_BYTE,
            pixels
        );


        /*for ( let i = 0 ; i < 1024*1024; i++ ){
            pixels[i*8] += Math.random() * 10 - 5;
            pixels[i*8+4] += Math.random() * 10 - 5;
        }*/

        /*for ( let i = 0 ; i < 1024*1024; i++ ){

            // Bullet R value in the pixel's G position
            pixels[i*8+1] = 0;
            // Bullet G value in the pixel's B position
            pixels[i*8+2] = 255;
            // Bullet G value in the pixel's A position
            pixels[i*8+3] = 0;

            // Bullet X value in the next pixel's G position
            pixels[i*8+5] = 0;
            // Bullet Y value in the next pixel's B position
            pixels[i*8+6] = 123;
            // Bullet Z value in the next pixel's A position
            pixels[i*8+7] = 123;
        }*/

        for ( let i = 0 ; i < 1000; i++ ){

            // Bullet R value in the pixel's G position
            //pixels[i*8+1] += 10;
            // Bullet G value in the pixel's B position
            //pixels[i*8+2] += 10;
            // Bullet G value in the pixel's A position
            //pixels[i*8+3] += 10;

            // Bullet X value in the next pixel's G position
            pixels[i*8+5] += 10;
            // Bullet Y value in the next pixel's B position
            pixels[i*8+6] = 255;
            // Bullet Z value in the next pixel's A position
            pixels[i*8+7] += 10;
        }

        /*var a = 1.0 / 1024.0 * 1.0 * 2.0;
        var b = a + 1.0 / 1024.0;
        console.log(a);
        console.log(b);
        var indA = [ a * 1024, a*1024 + 1, a*1024 + 2 ];
        console.log(indA);
        var indB = [ b * 1024, b*1024 + 1, b*1024 + 2 ];
        console.log(indB);*/
        console.log(pixels[0] + ' ' + pixels[1] + ' ' + pixels[2] + ' ' + pixels[3] );
        console.log( '\t' + pixels[4] + ' ' + pixels[5] + ' ' + pixels[6] + ' ' + pixels[7] );

        // Flip the horizontal axis
        for ( let i = 0; i < width; i++ ){
            column = i * 4;
            for ( let j = 0; j < height / 2; j++ ){
                row = j * width * 4;
                reversed = ( height - 1 - j ) * width * 4;
                //log( 'i', i, 'j', j, 'column', column, 'row', row, 'reversed', reversed );
                //console.log( 'swap ' +(column+row) + ' with ' + (column+reversed) );
                for ( let k = 0; k < 4; k++ ){
                    tmp = pixels[ column + row + k ];
                    pixels[ column + row  + k ] = pixels[ column + reversed + k ];
                    pixels[ column + reversed + k ] = tmp;
                }
            }
        }

        // upload changes
        gl.bindTexture( gl.TEXTURE_2D, texture );
        //gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, pixels);
        gl.texImage2D(
            gl.TEXTURE_2D, 0, gl.RGBA,
            width, height, 0,
            gl.RGBA, gl.UNSIGNED_BYTE, pixels
        );
    }

    gl.deleteFramebuffer( framebuffer );
}
