attribute vec4 a_Position;
attribute vec3 a_Normal;
attribute vec4 a_Color;
attribute vec2 a_TexCoord;
uniform mat4 u_mMatrix;
uniform mat4 u_vMatrix;
uniform mat4 u_pMatrix;
uniform sampler2D u_Sampler;
uniform float u_Step;
uniform float u_LightZ;
uniform float u_LightX;
uniform float u_PointLights;
varying vec4 v_Color;
varying float v_Height;
varying vec4 heightOffset;
float upPos, downPos, leftPos, rightPos;
float upHeight, downHeight, leftHeight, rightHeight;
float nDotL, distanceRate;
float heightScale = 5.0;
vec4 vertexPosition;
vec3 derivateS, derivateT, normal;
vec3 lightColor = vec3( 0.8, 0.8, 0.8 );
vec3 lightDirection = normalize( vec3( u_LightX, 10.0, u_LightZ ) );
vec3 ambientLight = vec3( 0.5, 0.5, 0.5 );
vec3 diffuse, ambient;
uniform vec3 u_PointLightColor[' + maxPointLights + '];
uniform vec3 u_PointLightPos[' + maxPointLights + '];
//varying vec2 v_TexCoord;

void main() {

  float b;
  for ( float i = 0.0; i >= 0.0; i++ ){ if ( i == u_PointLights ) break; b = u_PointLightPos[int(i)].x; }

  v_Height = a_Position.y;
  if ( v_Height == 0.0 ){
//'    heightOffset = mat4( 1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, texture2D(u_Sampler, a_TexCoord).r * 2.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0 );
    heightOffset = vec4( 0.0,texture2D(u_Sampler, a_TexCoord).r * heightScale, 0.0, 0.0 );
    vertexPosition = a_Position + heightOffset;
    gl_Position = u_pMatrix * u_vMatrix * u_mMatrix * vertexPosition;
  }else {
    gl_Position = u_pMatrix * u_vMatrix * u_mMatrix * a_Position;
  }

//'  v_TexCoord = a_TexCoord;

   // Get the location of the four closest vertices, in taxicab distance.
   // We don't need to explicitly handle over- or underflowed positions
   // if we tell WebGL to clamp the texture wrapping
  upPos = a_TexCoord.t + u_Step;
  downPos = a_TexCoord.t - u_Step;
  leftPos = a_TexCoord.s - u_Step;
  rightPos = a_TexCoord.s + u_Step;

   // Find the height of the three closest vertices
  upHeight = texture2D( u_Sampler, vec2( a_TexCoord.s, upPos ) ).r * heightScale;
  downHeight = texture2D( u_Sampler, vec2( a_TexCoord.s, downPos ) ).r * heightScale;
  leftHeight = texture2D( u_Sampler, vec2( leftPos, a_TexCoord.t ) ).r * heightScale;
  rightHeight = texture2D( u_Sampler, vec2( rightPos, a_TexCoord.t ) ).r * heightScale;

   // Aproximate the partial derivates using position and inclination
   // of the four closest vertices
  derivateS = vec3( 2.0 * u_Step, rightHeight - leftHeight, 0.0 );
  derivateT = vec3( 0.0, downHeight - upHeight, -2.0 * u_Step );
   // Compute the normal as the cross product of the partial derivates
  normal = normalize( cross( derivateS, derivateT ) );
   // Dot product of light direction and surface orientation
  nDotL = max( dot( lightDirection, a_Normal ), 0.0 );
  nDotL = max( dot( lightDirection, normal ), 0.0 );

   // Calculate render color based on vertex color, normal and lighting
  diffuse = lightColor * a_Color.rgb * nDotL;
  ambient = ambientLight * a_Color.rgb;

// Add lighting for every bullet in the scene
//'  for ( float i = 0.0; i >= 0.0; i++ ){
//'    if ( i == u_PointLights )
//'      break;
  // Retrieve its color and position
  // from the unused values of the texture
//'    pointLightColor = texture2D( u_Sampler, vec2(0,0) ).gba / 255.0; // vec2( 1.0 - ( 1.0 / 1024.0 * i * 2.0 + 1.0 / 1024.0 ), 0 ) en lugar de vec2
//'    pointLightPos = texture2D( u_Sampler, vec2( 1.0 / 1024.0 * i * 2.0 + 1.0, 0 ) ).gba / 20.0;

  for ( float i = 0.0; i >= 0.0; i++ ){
    if ( i == u_PointLights ){
      break;
    b = u_PointLightPos[int(i)].x; }
  // Calculate the color to be added
    nDotL = max( normalize( dot(u_PointLightPos[int(i)], normal ) ), 0.0 );
    distanceRate = 1.0 - min( distance( vertexPosition, vec4( u_PointLightPos[int(i)], 1.0 ) ), 8.0 ) / 8.0;// vec4(pointLightPos,1.0) en lugar de vec4
//'    distanceRate = 1.0;
    diffuse += u_PointLightColor[int(i)] * a_Color.rgb * nDotL * distanceRate;//pointLightColor en lugar de vec3
  }

// Calculate the final color of the vertex
  v_Color = vec4( diffuse + ambient, a_Color.a );
// Letting the fragment shader know which vertices to color
//'  v_Color = a_Color;
};
