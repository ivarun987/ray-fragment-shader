#ifdef GL_ES
precision mediump float;
#endif

#define MAX_REFLECT 16

uniform vec2 u_resolution;
uniform float u_time;

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

struct Plane {
    vec3 position;
    vec3 normal;
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
const float epsilon = 0.0001;

int skyId = 0;
int sphereId = 1;
int planeId = 2;

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

float computePlaneIntersection(inout Ray ray, in Plane plane) {
    float t = -1.0;
    float d = dot(plane.normal, ray.direction);
    if (abs(d) <= epsilon) {
        return t;
    }
    t = dot(plane.normal, plane.position - ray.origin) / d;
    ray.origin = ray.origin + t * ray.direction;
    ray.direction = -sign(d) * plane.normal;
    return t;
}

Material computeCheckboard(in vec3 position, in Plane plane) {
    vec3 side = vec3(1.0, 0.0, 0.0);
    vec3 axisX = normalize(side - dot(side, plane.normal) * plane.normal);
    vec3 axisY = normalize(cross(plane.normal, axisX));
    vec3 vDelta = position - plane.position;
    float u = dot(vDelta, axisX);
    float v = dot(vDelta, axisY);
    if (mod(floor(u * 0.5) + floor(v * 0.5), 2.0) < 1.0) {
        plane.material.color = vec3(0.0, 0.0, 0.0);
    }
    return plane.material;
}

vec3 computePhongShading(in Ray ray, in Ray intersection, in Material material, in Light light, in float shadow_factor) {
    vec3 L = normalize(light.position - intersection.origin);
    vec3 R = 2.0 * dot(L, intersection.direction) * intersection.direction - L;
    vec3 V = -ray.direction;

    vec3 ambient = material.ka * light.color.ambient;
    vec3 diffuse = material.kd * light.color.diffuse * material.color * max(dot(intersection.direction, L), 0.0);
    vec3 specular = material.ks * light.color.specular * material.color * pow(max(dot(R, V), 0.0), material.shininess);

    float specular_shadow_factor = shadow_factor < 1.0 ? 0.0 : 1.0;

    return ambient + (diffuse * shadow_factor) + (specular * specular_shadow_factor);
}

float computeNearestIntersection(inout Ray ray, in Sphere sphere, in Plane plane, out int id) {
    id = skyId;
    float t = infini;
    Ray intersection = ray;

    Ray iSphere = ray;
    float dSphere = computeSphereIntersection(iSphere, sphere);
    if (dSphere > epsilon && dSphere < t) {
        id = sphereId;
        t = dSphere;
        intersection = iSphere;
    }

    Ray iPlane = ray;
    float dPlane = computePlaneIntersection(iPlane, plane);
    if (dPlane > epsilon && dPlane < t) {
        id = planeId;
        t = dPlane;
        intersection = iPlane;
    }

    if (id == skyId) {
        t = -1.0;
    }

    ray = intersection;

    return t;
}

float computeShadowFactor(inout Ray ray, in Material material, in Sphere sphere, in Plane plane, in Light light) {
    Ray iShadow = ray;
    iShadow.origin = ray.origin + epsilon * ray.direction;
    iShadow.direction = light.position - ray.origin;
    int id = skyId;
    float ray_length = computeNearestIntersection(iShadow, sphere, plane, id);
    if (ray_length > epsilon && ray_length < length(light.position - ray.origin) - epsilon) {
        return material.ka;
    }
    return 1.0;
}

void drawScene(inout Pixel pixel, inout Ray ray, in Sphere sphere, in Plane plane, in Light[2] light) {
    Ray intersection = ray;
    Material material_reflect[MAX_REFLECT];
    int n = 0;
    int id = skyId;
    do {
        float ray_length = computeNearestIntersection(intersection, sphere, plane, id);

        if (id == sphereId) {
            material_reflect[n] = sphere.material;
            float shadow_factor = computeShadowFactor(intersection, sphere.material, sphere, plane, light[0]);
            material_reflect[n].color = computePhongShading(ray, intersection, sphere.material, light[0], shadow_factor);
            shadow_factor = computeShadowFactor(intersection, sphere.material, sphere, plane, light[1]);
            material_reflect[n].color += computePhongShading(ray, intersection, sphere.material, light[1], shadow_factor);
            material_reflect[n].color /= 2.0;
        } else if (id == planeId) {
            material_reflect[n] = plane.material;
            float shadow_factor = computeShadowFactor(intersection, plane.material, sphere, plane, light[0]);
            material_reflect[n].color = computePhongShading(ray, intersection, computeCheckboard(intersection.origin, plane), light[0], shadow_factor);
            shadow_factor = computeShadowFactor(intersection, plane.material, sphere, plane, light[1]);
            material_reflect[n].color += computePhongShading(ray, intersection, computeCheckboard(intersection.origin, plane), light[1], shadow_factor);
            material_reflect[n].color /= 2.0;
        } else {
            material_reflect[n++] = Material(
                background,
                0.0,
                0.0,
                0.0,
                0.0
            );
            break;
        }
        intersection.origin += intersection.direction * epsilon;
    } while (n++ < MAX_REFLECT);

    for (int i = n-1; i >= 0; --i) {
        pixel.color *= material_reflect[i].ks;
        pixel.color += material_reflect[i].color;
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

    Light light[2];

    light[0] = Light(
        vec3(cos(u_time) * 10.0, 10.0, sin(u_time) * 10.0),                     /* position */
        LightColor(                                                             /* color */
            vec3(1.0, 1.0, 1.0),                                                /* ambient */
            vec3(1.0, 1.0, 1.0),                                                /* diffuse */
            vec3(1.0, 1.0, 1.0)                                                 /* specular */
        )
    );

    light[1] = Light(
        vec3(sin(u_time) * 10.0, 10.0, cos(u_time) * 10.0),                     /* position */
        LightColor(                                                             /* color */
            vec3(1.0, 1.0, 1.0),                                                /* ambient */
            vec3(1.0, 1.0, 1.0),                                                /* diffuse */
            vec3(1.0, 1.0, 1.0)                                                 /* specular */
        )
    );

    Plane plane = Plane(
        vec3(0.0, -1.0, 0.0),                                                   /* position */
        vec3(0.0, 1.0, 0.0),                                                    /* normal */
        Material(                                                               /* material */
            vec3(1.0, 1.0, 1.0),                                                /* color */
            0.1,                                                                /* ka */
            0.8,                                                                /* kd */
            0.2,                                                                /* ks */
            32.0                                                                /* shininess */
        )
    );

    Sphere sphere = Sphere(
        0.5,                                                                    /* radius */
        vec3(0.0, sin(u_time) + 0.5, 0.0),                                                    /* position */
        Material(                                                               /* material */
            vec3(0.2, 0.8, 0.2),                                                /* color */
            0.1,                                                                /* ka */
            0.8,                                                                /* kd */
            0.4,                                                                /* ks */
            32.0                                                                /* shininess */
        )
    );

    drawScene(pixel, ray, sphere, plane, light);

    gl_FragColor = vec4(pixel.color, 1.0);
}
