



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

    // Set the texture unit 0 to the sampler
    gl.uniform1i(u_Sampler, 0);
}



function modifyTexture( gl, texture, bullets ){


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

        var amount;
        for ( let i = 0 ; i < 1024*1024*4; i+=64 ){

            // Loop unrolling for efficiency matters
            amount = Math.random() * 10 - 5;
            pixels[i] += amount;
            pixels[i+4] += amount;
            pixels[i+8] += amount;
            pixels[i+12] += amount;
            pixels[i+16] += amount;
            pixels[i+20] += amount;
            pixels[i+24] += amount;
            pixels[i+28] += amount;
            pixels[i+32] += amount;
            pixels[i+36] += amount;
            pixels[i+40] += amount;
            pixels[i+44] += amount;
            pixels[i+48] += amount;
            pixels[i+52] += amount;
            pixels[i+56] += amount;
            pixels[i+60] += amount;
        }


        // Flip the horizontal axis for the new upload
        for ( let i = 0; i < width; i++ ){
            column = i * 4;
            for ( let j = 0; j < height / 2; j++ ){
                row = j * width * 4;
                reversed = ( height - 1 - j ) * width * 4;
                for ( let k = 0; k < 4; k++ ){
                    tmp = pixels[ column + row + k ];
                    pixels[ column + row  + k ] = pixels[ column + reversed + k ];
                    pixels[ column + reversed + k ] = tmp;
                }
            }
        }


        // Upload changes
        gl.bindTexture( gl.TEXTURE_2D, texture );
        gl.texImage2D(
            gl.TEXTURE_2D, 0, gl.RGBA,
            width, height, 0,
            gl.RGBA, gl.UNSIGNED_BYTE, pixels
        );
    }

    gl.deleteFramebuffer( framebuffer );
}
