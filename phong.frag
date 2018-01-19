#ifdef GL_ES
precision mediump float;
#endif

uniform vec2 u_resolution;

struct Pixel {
    vec2 coordinate;
    vec3 color;
};

struct Material {
    vec3 color;
    float ka;
    float kd;
    float ks;
    float shininess;
};

struct Sphere {
    float radius;
    vec3 position;
    Material material;
};

struct LightColor {
    vec3 ambient;
    vec3 diffuse;
    vec3 specular;
};

struct Light {
    vec3 position;
    LightColor color;
};

struct Camera {
    vec3 eye;
    vec3 front;
    vec3 up;
    float fov;
};

struct Ray {
    vec3 origin;
    vec3 direction;
};

const vec3 background = vec3(0.1, 0.2, 0.4);
const float infini = 1.0 / 0.0;

Pixel initPixel(in vec3 color) {
    Pixel pixel = Pixel(
        2.0 * gl_FragCoord.xy / u_resolution.xy - 1.0,                          /* coordinate */
        color                                                                   /* color */
    );
    float ratio = u_resolution.x / u_resolution.y;
    if (ratio > 1.0) {
        pixel.coordinate.x *= ratio;
    } else {
        pixel.coordinate.y /= ratio;
    }
    return pixel;
}

Ray initRay(in Pixel pixel, in Camera camera) {
    float focal = 1.0 / tan(radians(camera.fov) / 2.0);

    vec3 forward = normalize(camera.front);
    vec3 side = normalize(cross(forward, camera.up));
    vec3 up = normalize(cross(forward, side));

    vec3 direction = normalize(pixel.coordinate.x * side - pixel.coordinate.y * up + focal * forward);

    return Ray(
        camera.eye,                                                             /* origin */
        direction                                                               /* direction */
    );
}

float computeSphereIntersection(inout Ray ray, in Sphere sphere) {
    float a = dot(ray.direction, ray.direction);
    float b = 2.0 * dot(ray.direction, ray.origin - sphere.position);
    float c = dot(ray.origin - sphere.position, ray.origin - sphere.position) - sphere.radius * sphere.radius;
    float t = -1.0;
    float delta = b * b - 4.0 * a * c;
    if (delta >= 0.0) {
        float sqrt_delta = sqrt(delta);
        float t1 = (- b - sqrt_delta) / (2.0 * a);
        float t2 = (- b + sqrt_delta) / (2.0 * a);
        float direction = 1.0;
        if (t1 > 0.0) {
            t = t1;
        } else if (t2 > 0.0) {
            t = t2;
            direction = -1.0;
        } else {
            return t;
        }
        ray.origin = ray.origin + t * ray.direction;
        ray.direction = normalize(ray.origin - sphere.position) * direction;
    }
    return t;
}

vec3 computePhongShading(in Ray ray, in Ray intersection, in Material material, in Light light) {
    vec3 L = normalize(light.position - intersection.origin);
    vec3 R = 2.0 * dot(L, intersection.direction) * intersection.direction - L;
    vec3 V = -ray.direction;

    vec3 ambient = material.ka * light.color.ambient;
    vec3 diffuse = material.kd * light.color.diffuse * material.color * max(dot(intersection.direction, L), 0.0);
    vec3 specular = material.ks * light.color.specular * material.color * pow(max(dot(R, V), 0.0), material.shininess);

    return ambient + diffuse + specular;
}

void drawSphere(inout Pixel pixel, inout Ray ray, in Sphere sphere, in Light light) {
    Ray intersection = ray;
    float ray_length = computeSphereIntersection(intersection, sphere);
    if (ray_length > 0.0 && ray_length < infini) {
        pixel.color = computePhongShading(ray, intersection, sphere.material, light);
    }
}

void main(){
    Pixel pixel = initPixel(background);

    Camera camera = Camera(
        vec3(0.0, 0.0,  5.0),                                                   /* eye */
        vec3(0.0, 0.0, -1.0),                                                   /* front */
        vec3(0.0, 1.0,  0.0),                                                   /* up */
        45.0                                                                    /* fov */
    );

    Ray ray = initRay(pixel, camera);

    Light light = Light(
        vec3(10.0, 10.0, 10.0),                                                 /* position */
        LightColor(                                                             /* color */
            vec3(1.0, 1.0, 1.0),                                                /* ambient */
            vec3(1.0, 1.0, 1.0),                                                /* diffuse */
            vec3(1.0, 1.0, 1.0)                                                 /* specular */
        )
    );

    Sphere sphere = Sphere(
        0.5,                                                                    /* radius */
        vec3(0.0, 0.0, 0.0),                                                    /* position */
        Material(                                                               /* material */
            vec3(0.2, 0.8, 0.2),                                                /* color */
            0.1,                                                                /* ka */
            0.5,                                                                /* kd */
            0.8,                                                                /* ks */
            32.0                                                                /* shininess */
        )
    );

    drawSphere(pixel, ray, sphere, light);

    gl_FragColor = vec4(pixel.color, 1.0);
}
