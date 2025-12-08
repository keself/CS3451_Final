#version 330 core

/*default camera matrices. do not modify.*/
layout(std140) uniform camera
{
    mat4 projection;	/*camera's projection matrix*/
    mat4 view;			/*camera's view matrix*/
    mat4 pvm;			/*camera's projection*view*model matrix*/
    mat4 ortho;			/*camera's ortho projection matrix*/
    vec4 position;		/*camera's position in world space*/
};

/* set light ubo. do not modify.*/
struct light
{
	ivec4 att; 
	vec4 pos; // position
	vec4 dir;
	vec4 amb; // ambient intensity
	vec4 dif; // diffuse intensity
	vec4 spec; // specular intensity
	vec4 atten;
	vec4 r;
};
layout(std140) uniform lights
{
	vec4 amb;
	ivec4 lt_att; // lt_att[0] = number of lights
	light lt[4];
};

uniform float iTime;
uniform mat4 model;

/*input variables*/
in vec3 vtx_normal; // vtx normal in world space
in vec3 vtx_position; // vtx position in world space
in vec3 vtx_model_position; // vtx position in model space
in vec4 vtx_color;
in vec2 vtx_uv;
in vec3 vtx_tangent;

uniform vec3 ka;
uniform vec3 kd;
uniform vec3 ks;
uniform float shininess;

/*output variables*/
out vec4 frag_color;


float hash2d(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

vec4 shading_phong(light li, vec3 e, vec3 p, vec3 n) {
    vec3 v = normalize(e - p);
    vec3 l = normalize(li.pos.xyz - p);
    vec3 r = normalize(reflect(-l, n));

    vec3 ambColor = ka * li.amb.rgb;
    vec3 difColor = kd * li.dif.rgb * max(0., dot(n, l));
    vec3 specColor = ks * li.spec.rgb * pow(max(dot(v, r), 0.), shininess);

    return vec4(ambColor + difColor + specColor, 1);
}

void main() {

    vec3 e = position.xyz;
    vec3 p = vtx_position;
    vec3 N = normalize(vtx_normal);

    vec4 total_light = vec4(0.0);
    for (int i = 0; i < lt_att[0]; ++i)
        total_light += shading_phong(lt[i], e, p, N);
        
    float u = atan(N.z, N.x) / (2.0 * 3.14159265) + 0.5;
    float v = (N.y * 0.5) + 0.5;

    vec2 uv = vec2(u, v);

    float tilesAround = 40.0;
    float tilesUp = 30.0;

    vec2 gridUV = vec2(uv.x * tilesAround, uv.y * tilesUp);
    vec2 cellId = floor(gridUV);
    vec2 cellFrac = fract(gridUV);

    float border = 0.05;
    float inTile = step(border, cellFrac.x) * step(border, cellFrac.y)
                 * step(cellFrac.x, 1.0 - border) * step(cellFrac.y, 1.0 - border);

    float tileRand = hash2d(cellId);
    float baseShade = 0.4 + 0.6 * tileRand;
    float sparkle = 0.1 * sin(iTime * 2.0 + tileRand * 20.0);
    float brightness = clamp(baseShade + sparkle, 0.2, 1.2);

    vec3 tileColor = vec3(0.85, 0.88, 1.0) * brightness;
    vec3 mirrorBallColor = mix(vec3(0.3), tileColor, inTile);

    frag_color = vec4(mirrorBallColor, 1.0);
}
