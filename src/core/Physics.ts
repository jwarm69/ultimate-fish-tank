import * as CANNON from 'cannon-es';
import { Component } from './types';

export class Physics implements Component {
  private world!: CANNON.World;
  private bodies: CANNON.Body[] = [];

  init(): void {
    // Create physics world
    this.world = new CANNON.World({
      gravity: new CANNON.Vec3(0, -9.82, 0),
    });

    // Set broadphase for better performance
    this.world.broadphase = new CANNON.NaiveBroadphase();
    this.world.solver.iterations = 10;
    this.world.allowSleep = true;

    // Add tank boundaries
    this.createTankBoundaries();

    console.log('⚙️ Physics world initialized');
  }

  private createTankBoundaries(): void {
    const tankSize = { width: 20, height: 8, depth: 12 };

    // Create invisible walls
    const wallMaterial = new CANNON.Material('wall');
    wallMaterial.friction = 0.1;
    wallMaterial.restitution = 0.3;

    // Bottom
    const groundShape = new CANNON.Box(
      new CANNON.Vec3(tankSize.width / 2, 0.1, tankSize.depth / 2)
    );
    const groundBody = new CANNON.Body({ mass: 0, material: wallMaterial });
    groundBody.addShape(groundShape);
    groundBody.position.set(0, -tankSize.height / 2, 0);
    this.world.addBody(groundBody);
    this.bodies.push(groundBody);

    // Top
    const topShape = new CANNON.Box(new CANNON.Vec3(tankSize.width / 2, 0.1, tankSize.depth / 2));
    const topBody = new CANNON.Body({ mass: 0, material: wallMaterial });
    topBody.addShape(topShape);
    topBody.position.set(0, tankSize.height / 2, 0);
    this.world.addBody(topBody);
    this.bodies.push(topBody);

    // Walls
    const wallShapes = [
      {
        shape: new CANNON.Box(new CANNON.Vec3(0.1, tankSize.height / 2, tankSize.depth / 2)),
        pos: [-tankSize.width / 2, 0, 0],
      },
      {
        shape: new CANNON.Box(new CANNON.Vec3(0.1, tankSize.height / 2, tankSize.depth / 2)),
        pos: [tankSize.width / 2, 0, 0],
      },
      {
        shape: new CANNON.Box(new CANNON.Vec3(tankSize.width / 2, tankSize.height / 2, 0.1)),
        pos: [0, 0, -tankSize.depth / 2],
      },
      {
        shape: new CANNON.Box(new CANNON.Vec3(tankSize.width / 2, tankSize.height / 2, 0.1)),
        pos: [0, 0, tankSize.depth / 2],
      },
    ];

    wallShapes.forEach(({ shape, pos }) => {
      const body = new CANNON.Body({ mass: 0, material: wallMaterial });
      body.addShape(shape);
      body.position.set(pos[0], pos[1], pos[2]);
      this.world.addBody(body);
      this.bodies.push(body);
    });
  }

  update(deltaTime: number): void {
    // Step the physics simulation
    this.world.fixedStep(1 / 60, deltaTime, 3);
  }

  getWorld(): CANNON.World {
    return this.world;
  }

  addBody(body: CANNON.Body): void {
    this.world.addBody(body);
    this.bodies.push(body);
  }

  removeBody(body: CANNON.Body): void {
    this.world.removeBody(body);
    const index = this.bodies.indexOf(body);
    if (index > -1) {
      this.bodies.splice(index, 1);
    }
  }

  destroy(): void {
    // Remove all bodies
    this.bodies.forEach(body => {
      this.world.removeBody(body);
    });
    this.bodies = [];

    // Clear the world
    if (this.world) {
      this.world.gravity.set(0, 0, 0);
    }
  }
}
