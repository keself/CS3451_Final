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

uniform vec3 ka;            /* object material ambient */
uniform vec3 kd;            /* object material diffuse */
uniform vec3 ks;            /* object material specular */
uniform float shininess;    /* object material shininess */

uniform sampler2D tex_color;   /* texture sampler for color */
uniform sampler2D tex_normal;   /* texture sampler for normal vector */

/*output variables*/
out vec4 frag_color;

float hash(float n) {
    return fract(sin(n) * 41973.67);
}

float hash2d(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 333.7))) * 41973.67);
}

float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    
    float a = hash2d(i);
    float b = hash2d(i + vec2(1.0, 0.0));
    float c = hash2d(i + vec2(0.0, 1.0));
    float d = hash2d(i + vec2(1.0, 1.0));
    
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

// making asphalt-like terrain on road
vec3 compute_asphalt_normal(vec2 uv) {
    vec2 p = uv * 50.0f;

    float eps = 0.1;
    float h = noise(p);
    float height_x = noise(p + vec2(eps, 0.0));
    float height_y = noise(p + vec2(0.0, eps));

    float slope_x = (height_x - h) / eps;
    float slope_y = (height_y - h) / eps;

    vec3 tangent_normal = normalize(vec3(-slope_x * 0.3, -slope_y * 0.3, 1.0));

    // adding a detail layer
    vec2 p2 = uv * 200.0f;
    float h2 = noise(p2);
    float height_x2 = noise(p2 + vec2(eps * 0.5, 0.0));
    float height_y2 = noise(p2 + vec2(0.0, eps * 0.5));
    
    // taking derivative
    float dx2 = (height_x2 - h2) / (eps * 0.5);
    float dy2 = (height_y2 - h2) / (eps * 0.5);
    
    tangent_normal += vec3(-dx2 * 0.15, -dy2 * 0.15, 0.0);
    tangent_normal = normalize(tangent_normal);
    
    return tangent_normal;
}

// converting normal from tangent to world space
vec3 tangent_to_world(vec3 tangent_normal, vec3 N, vec3 T) {
    vec3 B = normalize(cross(N, T));
    T = normalize(cross(B, N));
    
    // making tangent bitangent normal matirx
    mat3 tang_bitang_norm = mat3(T, B, N);
    return normalize(tang_bitang_norm * tangent_normal);
}

// markings on the street
vec3 add_concrete_detail(vec2 uv) {
    vec2 grid_uv = fract(uv * vec2(3.0, 6.0));
    
    float joint_width = 0.02;
    float joint = step(grid_uv.x, joint_width) + step(grid_uv.y, joint_width);
    joint = clamp(joint, 0.0, 1.0);
    
    vec3 joint_color = vec3(0.08, 0.08, 0.09);
    vec3 concrete_color = vec3(0.16, 0.16, 0.17);
    
    return mix(concrete_color, joint_color, joint * 0.7);
}

vec3 asphalt_texture(vec2 uv) {
    vec3 asphalt_base = vec3(0.15, 0.15, 0.16);
    float noise = hash2d(floor(uv * 50.0)) * 0.1;
    asphalt_base += vec3(noise * 0.2);

    float wear = sin(uv.y * 30.0 + hash2d(vec2(floor(uv.x * 10.0), 0.0)) * 0.1) * 0.5 + 0.5;
    wear *= 0.1;

    float oil = step(0.995, hash2d(floor(uv * 5.0)));
    asphalt_base = mix(asphalt_base, vec3(0.1, 0.1, 0.12), oil * 0.3);
    
    return asphalt_base - vec3(wear * 0.05);
}


vec3 shading_phong(light li, vec3 e, vec3 p, vec3 n) {
    vec3 v = normalize(e - p);
    vec3 l = normalize(li.pos.xyz - p);
    vec3 r = normalize(reflect(-l, n));

    vec3 ambColor = ka * li.amb.rgb;
    vec3 difColor = kd * li.dif.rgb * max(0., dot(n, l));
    vec3 specColor = ks * li.spec.rgb * pow(max(dot(v, r), 0.), shininess);

    return ambColor + difColor + specColor;
}

//vec3 read_normal_texture()
//{
    //vec3 normal = texture(tex_normal, vtx_uv).rgb;
    //normal = normalize(normal * 2.0 - 1.0);
    //return normal;
//

void main()
{
    vec3 e = position.xyz;              //// eye position
    vec3 p = vtx_position;              //// surface position
    vec3 N = normalize(vtx_normal);     //// normal vector
    vec3 T = normalize(vtx_tangent);    //// tangent vector

    vec3 tangent_normal = compute_asphalt_normal(vtx_uv);
    vec3 world_normal = tangent_to_world(tangent_normal, N, T);

    // getting asphalt textyre
    vec3 asphalt = asphalt_texture(vtx_uv);
    
    // getting road markings
    vec3 markings = add_concrete_detail(vtx_uv);
    
    // combining
    vec3 base_color = mix(asphalt, markings, step(0.1, length(markings)));
    
    // lighting
    vec3 total_light = vec3(0.0);
    for(int i = 0; i < lt_att[0]; i++) {
        total_light += shading_phong(lt[i], e, p, world_normal);
    }
    vec3 final_color = base_color * (0.5 + total_light * 0.5);
    
    frag_color = vec4(final_color, 1.0);
}
