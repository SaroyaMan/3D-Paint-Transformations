/*
    @Made By Yoav Saroya (304835887) & Amit Shmuel (305213621)
 */

import {Component, ElementRef, OnInit, ViewChild} from '@angular/core';

import * as math from 'mathjs';
import {Data} from './models/data.model';

enum DrawingOption {
    Parallel = 1,
    Oblique = 2,
    Perspective = 3,
}

enum Axis {
    X = 1,
    Y = 2,
    Z = 3
}


@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {

    @ViewChild('canvas') canvas: ElementRef;
    context: CanvasRenderingContext2D;
    widthCenter;
    heightCenter;

    middle = { x:-1, y:-1 };
    range = { maxX:0, maxY:0, minX:900, minY:550 };

    scaleValue = 1;

    readonly Z_DEPTH = 1500;
    readonly OBLIQUE_ANGLE = 45 / 180 * Math.PI;

    readonly COLOR             = '#ccc';
    readonly STROKE_COLOR      = '#000';

    vertices = [];
    polygons = [];

    currentDrawingOption:DrawingOption = DrawingOption.Perspective;
    currentAxis:Axis = Axis.X;
    currentAngle:number = 1;

    constructor() {}

    ngOnInit() {

        // Load the canvas context
        this.context = (<HTMLCanvasElement>this.canvas.nativeElement).getContext('2d');

        this.widthCenter = this.canvas.nativeElement.width / 2;
        this.heightCenter = this.canvas.nativeElement.height / 4;

        // Draw the shapes on canvas
        this.reload();
    }


    // Clear canvas
    clearCanvas() {
        this.context.clearRect(0, 0, this.canvas.nativeElement.width, this.canvas.nativeElement.height);
    }

    // Clear canvas and reload the file
    reload() {
        this.clearCanvas();
        this.drawShapes();
    }

    changeDrawOption() {
        console.log(this.currentDrawingOption);
        this.clearCanvas();
        if (this.vertices.length > 0 && this.polygons.length > 0)
            this.draw();
    }

    // Draw all shapes on canvas (Graphic Console)
    private drawShapes() {

        if(Data.polygons && Data.vertices) {
            this.polygons = Data.polygons.map(x => Object.assign({}, x));
            this.vertices = Data.vertices.map(x => Object.assign({}, x));
            this.middleCalc();
            this.clearCanvas();
            this.draw();
        }
        else {
            alert("File structure doesn't fit. make sure it contains polygons and vertices properties");
        }

    }


    //calculates all the end points of the portrait to 'range' object and calculates the center coordinate of the portrait
    private middleCalc() {
        this.range.maxX = 0;
        this.range.maxY = 0;
        this.range.minX = 900;
        this.range.minY = 550;

        for(let vert of this.vertices){
            let x = vert[0];
            let y = vert[1];
            if (x > this.range.maxX) this.range.maxX = x;
            if (x < this.range.minX) this.range.minX = x;
            if (y > this.range.maxY) this.range.maxY = y;
            if (y < this.range.minY) this.range.minY = y;
        }

        //calculating middle of the portrait
        this.middle.x = (this.range.maxX + this.range.minX) / 2;
        this.middle.y = (this.range.maxY + this.range.minY) / 2;
    }


    // sorts the polygons collection by thair depth
    private depthSorting() {
        this.polygons.sort( (a, b) => {
            let aDepth = 0, bDepth = 0;
            for (let i of a) aDepth += this.vertices[i][2];
            for (let j of b) bDepth += this.vertices[j][2];
            return ( aDepth / a.length ) - ( bDepth / b.length );
        });
    }

    // helping calculate the normal variable by the diff of polygons
    private getNormalVer(vera, verb) {
        let vp = {x:-1,y:-1,z:-1};
        // difference between polygons
        vp.x = this.vertices[verb][0] - this.vertices[vera][0];
        vp.y = this.vertices[verb][1] - this.vertices[vera][1];
        vp.z = this.vertices[verb][2] - this.vertices[vera][2];
        return vp;
    }

    // calculates normal by a given polygon parameter
    private calcNormal(polygon) {
        //now we need three vertices from each polygon in order to calculate each shape's Normal
        let vecA = this.getNormalVer(polygon[0],polygon[1]),
            vecB = this.getNormalVer(polygon[0],polygon[2]),
            vecC = this.getNormalVer(polygon[1],polygon[2]);

        // product a with b into normal1
        let normal1 = {x:-1,y:-1,z:-1};
        normal1.x = ( vecA.y*vecB.z - (vecA.z * vecB.y) );
        normal1.y = - (vecA.x*vecB.z - (vecA.z * vecB.x));
        normal1.z = ( vecA.x*vecB.y - ( vecA.y * vecB.x ));

        // product a with c into normal2
        let normal2 = {x:-1,y:-1,z:-1};
        normal2.x = ( vecA.y * vecC.z - (vecA.z * vecC.y) );
        normal2.y = - (vecA.x * vecC.z - (vecA.z * vecC.x));
        normal2.z = ( vecA.x * vecC.y - ( vecA.y * vecC.x ));

        // product normal1 with normal2 into normal3
        let normal3 = {x:-1,y:-1,z:-1};
        normal3.x = ( normal1.y * normal2.z - (normal1.z * normal2.y) );
        normal3.y = - (normal1.x * normal2.z - (normal1.z * normal2.x));
        normal3.z = ( normal1.x * normal2.y - ( normal1.y * normal2.x ));

        // calculates normal absolute size
        let firstArgument = Math.pow(normal3.x,2);
        let secondArgument = Math.pow(normal3.y,2);
        let thirdArugment = Math.pow(normal3.z,2);

        // let normalSize = Math.sqrt( firstArgument , secondArgument , thirdArugment);
        let normalSize = Math.sqrt(firstArgument);
        // console.log(`normalSize -> ${normalSize}`);

        return normalSize;
    }

    // Drawing the 3D picture - ( Entry function )
    private draw() {

        //ordering the shapes by depth
        this.depthSorting();

        //drawing each polygon
        for(let polygon of this.polygons) {

            let x1, y1, x2, y2, verticeA, verticeB;
            this.context.beginPath();

            //the first vertice of the selected polygon
            verticeA = this.vertices[polygon[0]];

            // check the picked drawing option
            if (this.currentDrawingOption === DrawingOption.Perspective) {

                x1 = verticeA[0] * (1/(1 + verticeA[2] / this.Z_DEPTH));
                y1 = verticeA[1] * (1/(1 + verticeA[2] / this.Z_DEPTH));

            }
            else if (this.currentDrawingOption === DrawingOption.Parallel) {

                // calculate the polygon normal
                if (this.calcNormal(polygon) < 0) continue;

                x1 = verticeA[0];
                y1 = verticeA[1];

            }
            else { // drawing oblique

                // check the polygon normal
                if (this.calcNormal(polygon) < 0) continue;

                x1 = verticeA[0] + verticeA[2] * Math.cos(this.OBLIQUE_ANGLE);
                y1 = verticeA[1] + verticeA[2] * Math.sin(this.OBLIQUE_ANGLE);
            }

            //stating point of the polygon
            this.context.moveTo(x1,y1);

            // connect all points of the polygon
            for (let v of Object.values(polygon)) {
                verticeB = this.vertices[v];
                if (this.currentDrawingOption === DrawingOption.Perspective) {
                    x2 = verticeB[0] * (1/(1 + verticeB[2] / this.Z_DEPTH));
                    y2 = verticeB[1] * (1/(1 + verticeB[2] / this.Z_DEPTH));
                } else if (this.currentDrawingOption === DrawingOption.Parallel) {
                    x2 = verticeB[0];
                    y2 = verticeB[1];
                } else {//drawing parallel oblique
                    x2 = verticeB[0] + verticeB[2] * Math.cos(this.OBLIQUE_ANGLE);
                    y2 = verticeB[1] + verticeB[2] * Math.sin(this.OBLIQUE_ANGLE);
                }
                this.context.lineTo(x2,y2);
            }

            //close to the start point
            this.context.lineTo(x1, y1);
            this.context.closePath();
            this.context.fillStyle = this.COLOR;
            this.context.strokeStyle = this.STROKE_COLOR;
            this.context.fill();
            this.context.stroke();
        }
    }

    //rotate's degree value
    onClickRotate() {

        let degreeValue = this.currentAngle;

        // if value is offset
        degreeValue = degreeValue > 360 ? degreeValue-=360 :
            degreeValue < -360 ? degreeValue += 360 :
                degreeValue;

        // calculate degree to rad
        degreeValue = degreeValue / 180 * Math.PI;

        // calculates next 3d points
        for( let val of Object.values(this.vertices)) {

            let x = val[0] - this.middle.x,
                y = val[1] - this.middle.y,
                z = val[2];

            if (this.currentAxis === Axis.X) {

                val[1] = (y * Math.cos(degreeValue) - z * Math.sin(degreeValue)) + this.middle.y;
                val[2] = (y * Math.sin(degreeValue) + z * Math.cos(degreeValue));

            }
            else if (this.currentAxis === Axis.Y) {

                val[0] = (x * Math.cos(degreeValue) - z * Math.sin(degreeValue)) + this.middle.x;
                val[2] = (x * Math.sin(degreeValue) + z * Math.cos(degreeValue));

            }
            else if(this.currentAxis === Axis.Z) {

                val[0] = (x * Math.cos(degreeValue) - y * Math.sin(degreeValue)) + this.middle.x;
                val[1] = (x * Math.sin(degreeValue) + y * Math.cos(degreeValue)) + this.middle.y;

            }
            else {
                alert("Invalid exis");}
        }
        this.clearCanvas();
        this.draw();
    }

    onClickScale() {

        if(this.scaleValue > 10 || this.scaleValue < 0.1){
            alert("Not a good scale value");
        }
        else {
            for(let vertice of this.vertices) {
                let x = vertice[0] - this.middle.x,
                    y = vertice[1] - this.middle.y,
                    z = vertice[2];

                vertice[0] = (this.scaleValue * x) + this.middle.x;
                vertice[1] = (this.scaleValue * y) + this.middle.y;
                vertice[2] = this.scaleValue * z;
            }
            this.clearCanvas();
            this.draw();
        }
    }
}
