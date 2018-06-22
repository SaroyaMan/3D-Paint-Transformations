/*
    @Made By Yoav Saroya (304835887) & Amit Shmuel (305213621)
 */

import {Component, ElementRef, OnInit, ViewChild} from '@angular/core';
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

    middle:any = { x:-1, y:-1 };
    range:any = { maxX:0, maxY:0, minX:1000, minY:1000 };

    readonly Z_DEPTH:number = 1500;
    readonly OBLIQUE_ANGLE:number = 45 / 180 * Math.PI;

    readonly STROKE_COLOR:string = '#000';

    vertices:any = [];
    polygons:any = [];

    currentDrawingOption:DrawingOption = DrawingOption.Perspective;
    currentAxis:Axis = Axis.X;
    currentAngle:number = 10;
    scaleValue:number = 1.1;


    constructor() {}

    ngOnInit() {

        // Load the canvas context
        this.context = (<HTMLCanvasElement>this.canvas.nativeElement).getContext('2d');

        // Draw the shapes on canvas
        this.reload();
    }


    // Clear canvas
    public clearCanvas() {
        this.context.clearRect(0, 0, this.canvas.nativeElement.width, this.canvas.nativeElement.height);
    }

    // Clear canvas and reload the data
    public reload() {
        this.clearCanvas();
        this.initialize();
    }

    public changeDrawOption() {
        this.clearCanvas();
        if (this.vertices.length > 0 && this.polygons.length > 0)
            this.draw();
    }

    public onClickRotate() {

        let degree = this.currentAngle;

        // Normalize the degree
        degree %= 360;

        // Convert degree to radiant
        degree = degree / 180 * Math.PI;

        for( let val of Object.values(this.vertices)) {

            let x = val[0] - this.middle.x,
                y = val[1] - this.middle.y,
                z = val[2];

            switch (this.currentAxis) {
                case Axis.X:
                    val[1] = (y * Math.cos(degree) - z * Math.sin(degree)) + this.middle.y;
                    val[2] = (y * Math.sin(degree) + z * Math.cos(degree));
                    break;

                case Axis.Y:
                    val[0] = (x * Math.cos(degree) - z * Math.sin(degree)) + this.middle.x;
                    val[2] = (x * Math.sin(degree) + z * Math.cos(degree));
                    break;

                case Axis.Z:
                    val[0] = (x * Math.cos(degree) - y * Math.sin(degree)) + this.middle.x;
                    val[1] = (x * Math.sin(degree) + y * Math.cos(degree)) + this.middle.y;
                    break;

                default:
                    alert("Selected axis is invalid");
                    return;

            }
        }
        this.clearCanvas();
        this.draw();
    }

    public onClickScale() {

        if(this.scaleValue > 10 || this.scaleValue < 0.1){
            alert("Invalid Scale Value. Must be 0.1 ~ 10");
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

    private initialize() {

        if(Data.polygons && Data.vertices) {
            this.polygons = Data.polygons.map(x => Object.assign({}, x));
            this.vertices = Data.vertices.map(x => Object.assign({}, x));

            // Generate a random color for each polygon
            for(let polygon of this.polygons) {
                polygon.color = AppComponent.generateRandomColor();
            }

            this.calculateCenter();
            this.draw();
        }
        else {
            alert("Error in Read the Data");
        }

    }


    // Calculates all the end points of the portrait to 'range' object
    // Calculates the center coordinate of the portrait
    private calculateCenter() {
        this.range.maxX = 0;
        this.range.maxY = 0;
        this.range.minX = 1000;
        this.range.minY = 1000;

        for(let vert of this.vertices){
            let x = vert[0];
            let y = vert[1];
            if (x > this.range.maxX) this.range.maxX = x;
            if (x < this.range.minX) this.range.minX = x;
            if (y > this.range.maxY) this.range.maxY = y;
            if (y < this.range.minY) this.range.minY = y;
        }

        // Calculating middle of the portrait
        this.middle.x = (this.range.maxX + this.range.minX) / 2;
        this.middle.y = (this.range.maxY + this.range.minY) / 2;
    }


    // sorts the polygons by their depth
    private depthSorting() {
        this.polygons.sort( (polygonA, polygonB) => {
            let aDepth = 0, bDepth = 0;
            for (let i of polygonA.verticeIndexes) aDepth += this.vertices[i][2];
            for (let j of polygonB.verticeIndexes) bDepth += this.vertices[j][2];
            return ( aDepth / polygonA.verticeIndexes.length ) - ( bDepth / polygonB.verticeIndexes.length );
        });
    }

    // Extra calculations for calculating the normal
    private calculateNormalVertice(vera, verb) {
        let vp = {x:-1,y:-1,z:-1};
        // Calculate difference between polygons
        vp.x = this.vertices[verb][0] - this.vertices[vera][0];
        vp.y = this.vertices[verb][1] - this.vertices[vera][1];
        vp.z = this.vertices[verb][2] - this.vertices[vera][2];
        return vp;
    }

    // calculates normal by a given polygon parameter
    private calculateNormal(polygon) {
        // Calculate 3 vertices from each polygon in order to calculate each shape's Normal
        let vecA = this.calculateNormalVertice(polygon.verticeIndexes[0],polygon.verticeIndexes[1]),
            vecB = this.calculateNormalVertice(polygon.verticeIndexes[0],polygon.verticeIndexes[2]),
            vecC = this.calculateNormalVertice(polygon.verticeIndexes[1],polygon.verticeIndexes[2]);

        // product vecA with vecB into firstNormal
        let firstNormal = {x:-1,y:-1,z:-1};
        firstNormal.x = ( vecA.y*vecB.z - (vecA.z * vecB.y) );
        firstNormal.y = - (vecA.x*vecB.z - (vecA.z * vecB.x));
        firstNormal.z = ( vecA.x*vecB.y - ( vecA.y * vecB.x ));

        // product vecA with vecB into secondNormal
        let secondNormal = {x:-1,y:-1,z:-1};
        secondNormal.x = ( vecA.y * vecC.z - (vecA.z * vecC.y) );
        secondNormal.y = - (vecA.x * vecC.z - (vecA.z * vecC.x));
        secondNormal.z = ( vecA.x * vecC.y - ( vecA.y * vecC.x ));

        // product firstNormal with secondNormal into thirdNormal
        let thirdNormal = {x:-1,y:-1,z:-1};
        thirdNormal.x = ( firstNormal.y * secondNormal.z - (firstNormal.z * secondNormal.y) );
        thirdNormal.y = - (firstNormal.x * secondNormal.z - (firstNormal.z * secondNormal.x));
        thirdNormal.z = ( firstNormal.x * secondNormal.y - ( firstNormal.y * secondNormal.x ));

        // calculates normal absolute size
        let xPow = Math.pow(thirdNormal.x,2);
        let yPow = Math.pow(thirdNormal.y,2);
        let zPow = Math.pow(thirdNormal.z,2);

        return Math.sqrt(xPow + yPow + zPow);
    }

    // Drawing the polygons
    private draw() {

        // Sorting the shapes by depth
        this.depthSorting();

        // Running through  polygons and draw each polygon
        for(let polygon of this.polygons) {

            let x1, y1, x2, y2, firstVertice, secondVertice;
            this.context.beginPath();

            firstVertice = this.vertices[polygon.verticeIndexes[0]];

            if (this.currentDrawingOption === DrawingOption.Perspective) {

                x1 = firstVertice[0] * (1/(1 + firstVertice[2] / this.Z_DEPTH));
                y1 = firstVertice[1] * (1/(1 + firstVertice[2] / this.Z_DEPTH));

            }
            else if (this.currentDrawingOption === DrawingOption.Parallel) {

                // calculate the polygon normal
                if (this.calculateNormal(polygon) < 0) continue;

                x1 = firstVertice[0];
                y1 = firstVertice[1];

            }
            else if(this.currentDrawingOption === DrawingOption.Oblique) {

                // check the polygon normal
                if (this.calculateNormal(polygon) < 0) continue;

                x1 = firstVertice[0] + firstVertice[2] * Math.cos(this.OBLIQUE_ANGLE);
                y1 = firstVertice[1] + firstVertice[2] * Math.sin(this.OBLIQUE_ANGLE);
            }
            else {
                alert("Invalid Drawing Option Value");
            }

            // Move the paint brush to starting point of the polygon
            this.context.moveTo(x1,y1);

            // Calculate polygon points in order to prepare for drawing
            for (let v of polygon.verticeIndexes) {
                secondVertice = this.vertices[v];
                if (this.currentDrawingOption === DrawingOption.Perspective) {
                    x2 = secondVertice[0] * (1/(1 + secondVertice[2] / this.Z_DEPTH));
                    y2 = secondVertice[1] * (1/(1 + secondVertice[2] / this.Z_DEPTH));
                }
                else if (this.currentDrawingOption === DrawingOption.Parallel) {
                    x2 = secondVertice[0];
                    y2 = secondVertice[1];
                }
                else {
                    x2 = secondVertice[0] + secondVertice[2] * Math.cos(this.OBLIQUE_ANGLE);
                    y2 = secondVertice[1] + secondVertice[2] * Math.sin(this.OBLIQUE_ANGLE);
                }
                this.context.lineTo(x2,y2);
            }

            //close to the start point
            this.context.lineTo(x1, y1);
            this.context.closePath();
            this.context.fillStyle = polygon.color;
            this.context.strokeStyle = this.STROKE_COLOR;
            this.context.fill();
            this.context.stroke();
        }
    }

    private static generateRandomColor() {
        let letters = '0123456789ABCDEF';
        let color = '#';
        for (let i = 0; i < 6; i++) {
            color += letters[Math.floor(Math.random() * 16)];
        }
        return color;
    }
}
