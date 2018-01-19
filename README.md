# Ray fragment shader

Raycasting and raytracing methods implements with GLSL

## How to run these shaders ?

You can use glslViewer if you want to run these shaders immediately. There is a submodule to do that in this project. Also, you can use it in your own GLSL program.

`glslviewer <shader_name>.frag -w 800 -h 600`

## Circle

`circle.frag`

This shader shows you how to switch between screen coordinate and world coordinate in 2D. Then, it just draws a circle.

![circle.frag](docs/screenshots/circle.png)

## Sphere

`sphere.frag`

This shader shows you how to use a 3D aspect in a fragment shader, with a simple ray casting method. Theoretically, it draws a sphere in three-dimensional space. But it looks like a circle because there is no light anymore.

![sphere.frag](docs/screenshots/sphere.png)
