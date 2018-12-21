#ifdef GL_ES
precision mediump float;
#endif
uniform vec4 u_FragColor;
uniform sampler2D u_Sampler;
varying vec4 v_Color;
varying float v_Height;
//'varying vec2 v_TexCoord;
float rate;
void main() {
   // Mix vertex color and texture for the floor
  if ( u_FragColor.r == 0.0 )
    gl_FragColor = v_Color;
//    gl_FragColor = mix( texture2D(u_Sampler, v_TexCoord), v_Color, 0.6 );
  else {
     // Polynomial interpolation of white and another color
     // for the actual chopper
    rate = (v_Height + 1.0) / 2.0;
    if ( rate > 1.0 )
      rate = 1.0;
    else if ( rate < -1.0 )
      rate = -1.0;
    gl_FragColor = mix( v_Color, u_FragColor, pow(rate,1.7) );
  }
};
