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

/* ----------- Phong shading helper ------------ */
vec4 shading_phong(light li, vec3 e, vec3 p, vec3 n) {
    vec3 v = normalize(e - p);
    vec3 l = normalize(li.pos.xyz - p);
    vec3 r = reflect(-l, n);

    vec3 ambient  = ka * li.amb.rgb;
    vec3 diffuse  = kd * li.dif.rgb * max(dot(n, l), 0.0);
    vec3 specular = ks * li.spec.rgb * pow(max(dot(v, r), 0.0), shininess);

    return vec4(ambient + diffuse + specular, 1.0);
}

/* ----------- MAIN ------------ */
void main() {

    vec3 e = position.xyz;
    vec3 p = vtx_position;
    vec3 N = normalize(vtx_normal);

    /* accumulate lighting */
    vec3 lightAccum = vec3(0);
    for (int i = 0; i < lt_att[0]; i++) {
        lightAccum += shading_phong(lt[i], e, p, N).rgb;
    }

    /* ---- make it look metallic / silver ----- */

    // base metal color (light silver)
    vec3 silver = vec3(0.75, 0.78, 0.82);

    // simple fresnel-like rim (makes metal pop)
    float rim = pow(1.0 - max(dot(N, normalize(e - p)), 0.0), 3.0);
    vec3 rimColor = vec3(0.25, 0.25, 0.28) * rim;

    vec3 finalColor = silver * lightAccum + rimColor;

    frag_color = vec4(finalColor, 1.0);
}