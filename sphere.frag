#ifdef GL_ES
precision mediump float;
#endif

uniform vec2 u_resolution;

struct Pixel {
    vec2 coordinate;
    vec3 color;
};

struct Sphere {
    float radius;
    vec3 position;
    vec3 color;
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

void drawSphere(inout Pixel pixel, inout Ray ray, in Sphere sphere) {
    float ray_length = computeSphereIntersection(ray, sphere);
    if (ray_length > 0.0 && ray_length < infini) {
        pixel.color = sphere.color;
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

    Sphere sphere = Sphere(
        0.5,                                                                    /* radius */
        vec3(0.0, 0.0, 0.0),                                                    /* position */
        vec3(0.2, 0.8, 0.2)                                                     /* color */
    );

    drawSphere(pixel, ray, sphere);

    gl_FragColor = vec4(pixel.color, 1.0);
}
