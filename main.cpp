#include "Common.h"
#include "OpenGLCommon.h"
#include "OpenGLMarkerObjects.h"
#include "OpenGLBgEffect.h"
#include "OpenGLMesh.h"
#include "OpenGLViewer.h"
#include "OpenGLWindow.h"
#include "TinyObjLoader.h"
#include "OpenGLSkybox.h"
#include <algorithm>
#include <iostream>
#include <random>
#include <unordered_set>
#include <vector>
#include <string>
#include <cmath>

#ifndef __Main_cpp__
#define __Main_cpp__

#ifdef __APPLE__
#define CLOCKS_PER_SEC 100000
#endif

class MyDriver : public OpenGLViewer
{
    std::vector<OpenGLTriangleMesh*> mesh_object_array;
    OpenGLBgEffect* bgEffect = nullptr;
    OpenGLSkybox* skybox = nullptr;
    clock_t startTime;

    // new years stuff
    OpenGLTriangleMesh* ground = nullptr;
    std::vector<OpenGLTriangleMesh*> buildings;

public:
    virtual void Initialize()
    {
        draw_axes = false;
        startTime = clock();
        OpenGLViewer::Initialize();
    }

    // making procedural buildings
    OpenGLTriangleMesh* Create_Building(float width, float depth, float height, Vector3f position) {
        std::vector<Vector3> vertices;
        std::vector<Vector3i> elements;
        std::vector<Vector2> uvs;

        // bottom face (y=0)
        vertices.push_back(Vector3(-width / 2.0f, 0.0f, -depth / 2.0f));
        vertices.push_back(Vector3(width / 2.0f, 0.0f, -depth / 2.0f));
        vertices.push_back(Vector3(width / 2.0f, 0.0f, depth / 2.0f));
        vertices.push_back(Vector3(-width / 2.0f, 0.0f, depth / 2.0f));

        // top face (y=height)
        vertices.push_back(Vector3(-width / 2.0f, height, -depth / 2.0f));
        vertices.push_back(Vector3(width / 2.0f, height, -depth / 2.0f));
        vertices.push_back(Vector3(width / 2.0f, height, depth / 2.0f));
        vertices.push_back(Vector3(-width / 2.0f, height, depth / 2.0f));

        // front face
        elements.push_back(Vector3i(0, 1, 5));
        elements.push_back(Vector3i(0, 5, 4));
        // right face
        elements.push_back(Vector3i(1, 2, 6));
        elements.push_back(Vector3i(1, 6, 5));
        // back face
        elements.push_back(Vector3i(2, 3, 7));
        elements.push_back(Vector3i(2, 7, 6));
        // left face
        elements.push_back(Vector3i(3, 0, 4));
        elements.push_back(Vector3i(3, 4, 7));
        // top face
        elements.push_back(Vector3i(4, 5, 6));
        elements.push_back(Vector3i(4, 6, 7));
        // bottom face
        elements.push_back(Vector3i(0, 2, 1));
        elements.push_back(Vector3i(0, 3, 2));

        // texture mappong
        for (int i = 0; i < 8; i++) {
            uvs.push_back(Vector2(0.0f, 0.0f));
        }

        auto building = Add_Tri_Mesh_Object(vertices, elements);
        building->mesh.Uvs() = uvs;

        // positioning
        Matrix4f t;
        t << 1.0f, 0.0f, 0.0f, position[0],
            0.0f, 1.0f, 0.0f, position[1],
            0.0f, 0.0f, 1.0f, position[2],
            0.0f, 0.0f, 0.0f, 1.0f;
        building->Set_Model_Matrix(t);

        return building;
    }

    // creatong the ground
    OpenGLTriangleMesh* Create_Ground_Plane(float width, float length, float height)
    {
        std::vector<Vector3> vertices;
        std::vector<Vector3i> elements;
        std::vector<Vector2> uvs;

        // slant upwards
        float halfW = width / 2.0f;

        // fronte dge (lower)
        vertices.push_back(Vector3(-halfW, 0.0f, 0.0f));
        vertices.push_back(Vector3(halfW, 0.0f, 0.0f));

        // back edge (higher)
        vertices.push_back(Vector3(-halfW, height, -length));
        vertices.push_back(Vector3(halfW, height, -length));

        // uvs
        uvs.push_back(Vector2(0.0f, 0.0f));
        uvs.push_back(Vector2(1.0f, 0.0f));
        uvs.push_back(Vector2(0.0f, 5.0f));
        uvs.push_back(Vector2(1.0f, 5.0f));

        elements.push_back(Vector3i(0, 1, 2));
        elements.push_back(Vector3i(1, 3, 2));

        auto mesh = Add_Tri_Mesh_Object(vertices, elements);
        mesh->mesh.Uvs() = uvs;
        return mesh;

    }

    virtual void Initialize_Data()
    {
        //// Load shaders
        OpenGLShaderLibrary::Instance()->Add_Shader_From_File("shaders/basic.vert", "shaders/basic.frag", "basic");
        OpenGLShaderLibrary::Instance()->Add_Shader_From_File("shaders/building.vert", "shaders/building.frag", "building");
        //OpenGLShaderLibrary::Instance()->Add_Shader_From_File("shaders/street.vert", "shaders/street.frag", "street");

        //// Load textures
        OpenGLTextureLibrary::Instance()->Add_Texture_From_File("tex/star.png", "star_color");

        // background - dark gradient
        {
            auto bg = Add_Interactive_Object<OpenGLBackground>();
            bg->Set_Color(OpenGLColor(0.01f, 0.01f, 0.05f, 1.0f), OpenGLColor(0.05f, 0.05f, 0.15f, 1.0f));
            bg->Initialize();
        }

        // making ground
        {
            //ground = Create_Ground_Plane(30.0f);  // 30 units 
            ground = Create_Ground_Plane(15.0f, 60.0f, 4.0f);

            Matrix4f t;
            t << 1.0f, 0.0f, 0.0f, 0.0f,
                0.0f, 1.0f, 0.0f, -5.0f,
                0.0f, 0.0f, 1.0f, 10.0f,
                0.0f, 0.0f, 0.0f, 1.0f;
            ground->Set_Model_Matrix(t);

            // colorings (still working on this)
            ground->Set_Ka(Vector3f(0.05f, 0.05f, 0.05f));
            ground->Set_Kd(Vector3f(0.25f, 0.25f, 0.25f));
            ground->Set_Ks(Vector3f(0.05f, 0.05f, 0.05f));
            ground->Set_Shininess(8.0f);

            ground->Add_Shader_Program(OpenGLShaderLibrary::Get_Shader("basic"));
        }

        //making the buildings
        {

            // left front
            auto b1 = Create_Building(2.0f, 3.0f, 8.0f, Vector3f(-4.0f, -3.0f, 0.0f));
            b1->Set_Ka(Vector3f(0.1f, 0.1f, 0.1f));
            b1->Set_Kd(Vector3f(0.3f, 0.35f, 0.35f));
            b1->Set_Ks(Vector3f(0.2f, 0.2f, 0.2f));
            b1->Set_Shininess(32.0f);
            b1->Add_Shader_Program(OpenGLShaderLibrary::Get_Shader("building"));
            buildings.push_back(b1);

            // right front
            auto b2 = Create_Building(2.0f, 3.0f, 8.5f, Vector3f(4.0f, -3.0f, 0.0f));
            b2->Set_Ka(Vector3f(0.1f, 0.1f, 0.1f));
            b2->Set_Kd(Vector3f(0.3f, 0.3f, 0.35f));
            b2->Set_Ks(Vector3f(0.2f, 0.2f, 0.2f));
            b2->Set_Shininess(32.0f);
            b2->Add_Shader_Program(OpenGLShaderLibrary::Get_Shader("building"));
            buildings.push_back(b2);

            // left mid
            auto b3 = Create_Building(1.5f, 2.5f, 9.5f, Vector3f(-3.5f, -2.0f, -5.0f));
            b3->Set_Ka(Vector3f(0.1f, 0.1f, 0.1f));
            b3->Set_Kd(Vector3f(0.25f, 0.25f, 0.3f));
            b3->Set_Ks(Vector3f(0.2f, 0.2f, 0.2f));
            b3->Set_Shininess(32.0f);
            b3->Add_Shader_Program(OpenGLShaderLibrary::Get_Shader("building"));
            buildings.push_back(b3);

            // right mid
            auto b4 = Create_Building(1.5f, 2.5f, 10.0f, Vector3f(3.5f, -2.0f, -5.0f));
            b4->Set_Ka(Vector3f(0.1f, 0.1f, 0.1f));
            b4->Set_Kd(Vector3f(0.25f, 0.3f, 0.3f));
            b4->Set_Ks(Vector3f(0.2f, 0.2f, 0.2f));
            b4->Set_Shininess(32.0f);
            b4->Add_Shader_Program(OpenGLShaderLibrary::Get_Shader("building"));
            buildings.push_back(b4);

            // left back
            auto b5 = Create_Building(1.0f, 2.0f, 11.0f, Vector3f(-3.0f, -1.0f, -10.0f));
            b5->Set_Ka(Vector3f(0.1f, 0.1f, 0.1f));
            b5->Set_Kd(Vector3f(0.2f, 0.2f, 0.25f));
            b5->Set_Ks(Vector3f(0.2f, 0.2f, 0.2f));
            b5->Set_Shininess(32.0f);
            b5->Add_Shader_Program(OpenGLShaderLibrary::Get_Shader("building"));
            buildings.push_back(b5);

            // right back
            auto b6 = Create_Building(1.0f, 2.0f, 12.0f, Vector3f(3.0f, -1.0f, -10.0f));
            b6->Set_Ka(Vector3f(0.1f, 0.1f, 0.1f));
            b6->Set_Kd(Vector3f(0.2f, 0.25f, 0.25f));
            b6->Set_Ks(Vector3f(0.2f, 0.2f, 0.2f));
            b6->Set_Shininess(32.0f);
            b6->Add_Shader_Program(OpenGLShaderLibrary::Get_Shader("building"));
            buildings.push_back(b6);
        }

        //// This for-loop updates the rendering model for each object on the list
        for (auto& mesh_obj : mesh_object_array) {
            Set_Polygon_Mode(mesh_obj, PolygonMode::Fill);
            Set_Shading_Mode(mesh_obj, ShadingMode::TexAlpha);
            mesh_obj->Set_Data_Refreshed();
            mesh_obj->Initialize();
        }
        Toggle_Play();
    }

    //// add mesh object by reading an .obj file
    OpenGLTriangleMesh* Add_Obj_Mesh_Object(std::string obj_file_name)
    {
        auto mesh_obj = Add_Interactive_Object<OpenGLTriangleMesh>();
        Array<std::shared_ptr<TriangleMesh<3>>> meshes;
        Obj::Read_From_Obj_File_Discrete_Triangles(obj_file_name, meshes);

        mesh_obj->mesh = *meshes[0];
        std::cout << "load tri_mesh from obj file, #vtx: " << mesh_obj->mesh.Vertices().size() << ", #ele: " << mesh_obj->mesh.Elements().size() << std::endl;

        mesh_object_array.push_back(mesh_obj);
        return mesh_obj;
    }

    //// add mesh object by reading an array of vertices and an array of elements
    OpenGLTriangleMesh* Add_Tri_Mesh_Object(const std::vector<Vector3>& vertices,
        const std::vector<Vector3i>& elements)
    {
        auto obj = Add_Interactive_Object<OpenGLTriangleMesh>();
        mesh_object_array.push_back(obj);

        obj->mesh.Vertices() = vertices;
        obj->mesh.Elements() = elements;

        return obj;
    }

    //// Go to next frame
    virtual void Toggle_Next_Frame()
    {
        float time = GLfloat(clock() - startTime) / CLOCKS_PER_SEC;

        // Update time uniform for all animated objects
        for (auto& mesh_obj : mesh_object_array) {
            mesh_obj->setTime(time);
        }

        if (bgEffect) {
            bgEffect->setResolution((float)Win_Width(), (float)Win_Height());
            bgEffect->setTime(time);
            bgEffect->setFrame(frame++);
        }

        if (skybox) {
            skybox->setTime(time);
        }

        OpenGLViewer::Toggle_Next_Frame();
    }

    virtual void Run()
    {
        OpenGLViewer::Run();
    }
};

int main(int argc, char* argv[])
{
    MyDriver driver;
    driver.Initialize();
    driver.Run();
}

#endif