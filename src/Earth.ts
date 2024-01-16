/* Assignment 3: Earthquake Visualization Support Code
 * UMN CSci-4611 Instructors 2012+
 * GopherGfx implementation by Evan Suma Rosenberg <suma@umn.edu> 2022
 * License: Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International
 * Please do not distribute beyond the CSci-4611 course
 */ 

import * as gfx from 'gophergfx'
import { EarthquakeMarker } from './EarthquakeMarker';
import { EarthquakeRecord } from './EarthquakeRecord';

export class Earth extends gfx.Node3
{
    private earthMesh: gfx.MorphMesh3;

    public globeMode: boolean;

    constructor()
    {
        // Call the superclass constructor
        super();

        this.earthMesh = new gfx.MorphMesh3();

        this.globeMode = false;
    }

    public createMesh() : void
    {
        // Initialize texture: you can change to a lower-res texture here if needed
        // Note that this won't display properly until you assign texture coordinates to the mesh
        this.earthMesh.material.texture = new gfx.Texture('./assets/earth-2k.png');
        
        // This disables mipmapping, which makes the texture appear sharper
        this.earthMesh.material.texture.setMinFilter(true, false);   

        // You can use this variable to define the resolution of your flat map and globe map
        // using a nested loop. 20x20 is reasonable for a good looking sphere, and you don't
        // need to change this constant to complete the base assignment.
        const meshResolution = 20;
        
        // Precalculated vertices and normals for the earth plane mesh.
        // After we compute them, we can store them directly in the earthMesh,
        // so they don't need to be member variables.
        const mapVertices: gfx.Vector3[] = [];
        const mapNormals: gfx.Vector3[] = [];

        // Part 1: Creating the Flat Map Mesh
        // To demo, we'll add a rectangle with two triangles.
        // This defines four vertices at each corner in latitude and longitude 
        // and converts to the coordinates used for the flat map.
        // The flat map normals are always directly outward towards the camera
        for (let i = 0; i <= meshResolution; i++) {
            for (let j = 0; j <= meshResolution; j++) {
                // Latitude and longitude
                const latitude = -90 + (180 / meshResolution) * i;
                const longitude = -180 + (360 / meshResolution) * j;

                // Convert it to a point on the plane and push in
                mapVertices.push(this.convertLatLongToPlane(latitude, longitude)); // degree to radians 
                // The flat map normals are always directly outward towards the camera
                mapNormals.push(gfx.Vector3.BACK);
            }
        }

        // Define indices into the array for the two triangles
        const indices: number[] = [];
        // indices
        //  UL--UR+1
        //  |  / |
        //  | /  |
        //  BL--BR+1
        // Create indices for triangles
        for (let i = 0; i < meshResolution; i++) {
            for (let j = 0; j < meshResolution; j++) {
                const upperLeft = i * (meshResolution + 1) + j; // 0
                const upperRight = upperLeft + 1; // 1
                const bottomLeft = (i + 1) * (meshResolution + 1) + j; // 21
                const bottomRight = bottomLeft + 1; // 22
  
                // Each square box must have two triangles in the mesh
                indices.push(upperLeft, upperRight, bottomLeft)
                indices.push(bottomLeft, upperRight, bottomRight)
            }
        }

        // Part 2: Texturing the Mesh
        const uvs: number[] = [];
        for (let i = 0; i <= meshResolution; i++) {
            for (let j = 0; j <= meshResolution; j++) {        
                const u = (j / meshResolution);
                const v = 1 - (i / meshResolution);
                uvs.push(u)
                uvs.push(v)
            }
        }

        // Set all the earth mesh data
        this.earthMesh.setVertices(mapVertices, true);
        this.earthMesh.setNormals(mapNormals, true);
        this.earthMesh.setIndices(indices);
        this.earthMesh.setTextureCoordinates(uvs);

        // Part 3: Creating the Globe Mesh
        // You should compute a new set of vertices and normals
        // for the globe. You will need to also add code in
        // the convertLatLongToSphere() method below.
        const sphereVertices: gfx.Vector3[] = [];
        const sphereNormals: gfx.Vector3[] = []

        for(let i=0; i<=meshResolution; i++){ 
            for(let j=0; j<=meshResolution; j++){

                const latitude_angle = -90 + (180 / meshResolution) * i;
                const longitude_angle = -180 + (360 / meshResolution) * j;
                
                // Sphere vertices
                const vertex = this.convertLatLongToSphere(latitude_angle, longitude_angle);
                sphereVertices.push(vertex);
                
                // Now compute the normals
                const normal = vertex.clone();
                normal.normalize()
                sphereNormals.push(normal);
            }
        }
        
        this.earthMesh.setMorphTargetVertices(sphereVertices)
        this.earthMesh.setMorphTargetNormals(sphereNormals)
        // Add the mesh to this group
        this.add(this.earthMesh);
    }

    public update(deltaTime: number) : void
    {
        // Part 4: Morphing Between the Map and Globe
        // The value of this.globeMode will be changed whenever
        // the user selects flat map or globe mode in the GUI.
        // You should use this boolean to control the morphing
        // of the earth mesh, as described in the readme.
        
        // Part 4: Morphing Between the Map and Globe
        const morphSpeed = 0.8 * deltaTime;
        const morpha = this.earthMesh.morphAlpha;
        if(this.globeMode && morpha < 1) {
            this.earthMesh.morphAlpha += morphSpeed;
        } 
        else if(!this.globeMode && morpha > 0) {
            this.earthMesh.morphAlpha -= morphSpeed;
        }
        
        this.earthMesh.morphAlpha = gfx.MathUtils.clamp(this.earthMesh.morphAlpha, 0, 1);
    }

    public createEarthquake(record: EarthquakeRecord)
    {
        // Number of milliseconds in 1 year (approx.)
        const duration = 12 * 28 * 24 * 60 * 60;

        // Part 5: Creating the Earthquake Markers
        // Currently, the earthquakes are just placed randomly
        // on the plane. You will need to update this code to
        // correctly calculate both the map and globe positions of the markers.

        const mapPosition = this.convertLatLongToPlane(record.latitude, record.longitude);
        const globePosition = this.convertLatLongToSphere(record.latitude, record.longitude);

        //const currentPosition = this.globeMode ? globePosition : mapPosition;
        let currentPosition = gfx.Vector3.ZERO;
        if(this.globeMode){
            currentPosition = globePosition;
        }else if(!this.globeMode){
            currentPosition = mapPosition; 
        }

        const earthquake = new EarthquakeMarker(currentPosition, globePosition, record, duration);

        // Global adjustment to reduce the size. You should probably
        // update this be a more meaningful representation.
        // earthquake.scale.set(0.5, 0.5, 0.5);
        const scale = gfx.MathUtils.rescale(record.magnitude, 0, 10, .3, .3)
        earthquake.scale.set(scale, scale, scale)

        // Change color based on magnitude.
        if (record.magnitude < 3) {
            earthquake.material.setColor(gfx.Color.PURPLE); 
        } else if (record.magnitude < 5 && record.magnitude > 3) {
            earthquake.material.setColor(gfx.Color.GREEN); 
        } else if (record.magnitude < 7 && record.magnitude > 5) {
            earthquake.material.setColor(gfx.Color.YELLOW); 
        } else {
            earthquake.material.setColor(gfx.Color.RED); 
        }

        // Uncomment this line of code to active the earthquake markers
        this.add(earthquake);
    }


    public animateEarthquakes(currentTime : number)
    {
        // This code removes earthquake markers after their life has expired
        this.children.forEach((quake: gfx.Node3) => {
            if(quake instanceof EarthquakeMarker)
            {
                const playbackLife = (quake as EarthquakeMarker).getPlaybackLife(currentTime);

                // The earthquake has exceeded its lifespan and should be moved from the scene
                if(playbackLife >= 1)
                {
                    quake.remove();
                }
                // The earthquake positions should be updated
                else
                {
                    // Part 6: Morphing the Earthquake Positions
                    // If we have correctly computed the flat map and globe positions
                    // for each earthquake marker in part 5, then we can simply lerp
                    // between them using the same alpha as the earth mesh.
                    quake.position.lerp(quake.mapPosition, quake.globePosition, this.earthMesh.morphAlpha);
                }
            }
        });
    }

    // This convenience method converts from latitude and longitude (in degrees) to a Vector3 object
    // in the flat map coordinate system described in the readme.
    public convertLatLongToPlane(latitude: number, longitude: number): gfx.Vector3
    {
        return new gfx.Vector3(longitude * Math.PI / 180, latitude * Math.PI / 180, 0);
    }

    // This convenience method converts from latitude and longitude (in degrees) to a Vector3 object
    // in the globe mesh map coordinate system described in the readme.
    public convertLatLongToSphere(latitude: number, longitude: number): gfx.Vector3
    {
        // Part 3: Creating the Globe Mesh
        // Add code here to correctly compute the 3D sphere position
        // based on latitude and longitude. 
        // const latRadian = latitude * Math.PI / 180;
        // const lonRadian = longitude * Math.PI / 180;

        const lat_in_radian = gfx.MathUtils.degreesToRadians(latitude)
        const lon_in_radian = gfx.MathUtils.degreesToRadians(longitude);
        
        return new gfx.Vector3(
           Math.cos(lat_in_radian) * Math.sin(lon_in_radian), 
           Math.sin(lat_in_radian), 
           Math.cos(lat_in_radian) * Math.cos(lon_in_radian)
        );
    }

    // This function toggles the wireframe debug mode on and off
    public toggleDebugMode(debugMode : boolean)
    {
        this.earthMesh.material.wireframe = debugMode;
    }
}