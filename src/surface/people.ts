import * as THREE from 'three';

/**
 * Stylised, toy-like people built from capsules and spheres (no external
 * models). Each person faces local +Z; their right hand is on −X.
 */
interface PersonSpec {
  height: number;
  skin: number;
  hair: number;
  hairStyle: 'short' | 'long' | 'ponytail';
  top: number;
  bottom: number;
  /** A dress replaces shorts. */
  dress?: boolean;
  sunHat?: boolean;
}

interface Person {
  group: THREE.Group;
  body: THREE.Group;
  head: THREE.Group;
  torso: THREE.Mesh;
  /** Shoulder pivots; arms hang along their local −Y. */
  rightArm: THREE.Group;
  leftArm: THREE.Group;
  armLength: number;
  shoulderY: number;
  shoulderX: number;
}

const DOWN = new THREE.Vector3(0, -1, 0);

function material(color: number, roughness = 0.75): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness });
}

function createPerson(spec: PersonSpec): Person {
  const h = spec.height;
  const adult = h > 1.5;
  const skin = material(spec.skin, 0.6);
  const top = material(spec.top);
  const bottom = material(spec.bottom);
  const hair = material(spec.hair, 0.5);

  const group = new THREE.Group();
  const body = new THREE.Group();
  group.add(body);
  const add = (mesh: THREE.Mesh, parent: THREE.Object3D = body) => {
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };

  const headR = (adult ? 0.062 : 0.08) * h;
  const legLen = (adult ? 0.47 : 0.43) * h;
  const legR = (adult ? 0.034 : 0.04) * h;
  const hipX = (adult ? 0.05 : 0.055) * h;
  const torsoR = (adult ? 0.072 : 0.08) * h;
  const neckLen = 0.03 * h;
  const shoulderY = h - 2 * headR - neckLen;
  const torsoLen = shoulderY - legLen;
  const armLen = (adult ? 0.36 : 0.35) * h;
  const armR = 0.024 * h;
  const shoulderX = torsoR * 1.2 + armR * 0.6;

  // Legs, sandals and shorts.
  for (const side of [-1, 1]) {
    const leg = add(
      new THREE.Mesh(new THREE.CapsuleGeometry(legR, legLen - 2 * legR, 4, 10), skin),
    );
    leg.position.set(side * hipX, legLen / 2 + 0.02, 0);
    const foot = add(
      new THREE.Mesh(new THREE.BoxGeometry(legR * 2.2, 0.03, legR * 4.2), material(0x5b3a29)),
    );
    foot.position.set(side * hipX, 0.015, legR * 0.9);
    if (!spec.dress) {
      const shortsLeg = add(
        new THREE.Mesh(new THREE.CapsuleGeometry(legR * 1.25, legLen * 0.32, 4, 10), bottom),
      );
      shortsLeg.position.set(side * hipX, legLen * 0.8, 0);
    }
  }
  if (spec.dress) {
    const skirt = add(
      new THREE.Mesh(
        new THREE.CylinderGeometry(torsoR * 1.05, 0.17 * h, legLen * 0.55, 18, 1),
        bottom,
      ),
    );
    skirt.position.y = legLen * 0.78;
  } else {
    const pelvis = add(
      new THREE.Mesh(new THREE.CapsuleGeometry(torsoR * 0.95, 0.02, 4, 12), bottom),
    );
    pelvis.scale.set(1.2, 1, 0.8);
    pelvis.position.y = legLen;
  }

  // Torso (slightly flattened front-to-back).
  const torso = add(
    new THREE.Mesh(
      new THREE.CapsuleGeometry(torsoR, Math.max(0.01, torsoLen - torsoR), 6, 14),
      top,
    ),
  );
  torso.scale.set(1.2, 1, 0.78);
  torso.position.y = legLen + torsoLen / 2 + 0.02;

  const neck = add(
    new THREE.Mesh(new THREE.CylinderGeometry(headR * 0.38, headR * 0.42, neckLen * 2, 10), skin),
  );
  neck.position.y = shoulderY + neckLen * 0.5;

  // Head with face and hair, in its own group so it can turn.
  const head = new THREE.Group();
  head.position.y = shoulderY + neckLen + headR;
  body.add(head);
  add(new THREE.Mesh(new THREE.SphereGeometry(headR, 24, 18), skin), head);
  const eye = new THREE.SphereGeometry(headR * 0.11, 8, 6);
  const dark = material(0x1a1a1a, 0.3);
  for (const side of [-1, 1]) {
    const e = new THREE.Mesh(eye, dark);
    e.position.set(side * headR * 0.36, headR * 0.12, headR * 0.92);
    head.add(e);
  }
  const smile = new THREE.Mesh(
    new THREE.TorusGeometry(headR * 0.26, headR * 0.045, 6, 14, Math.PI),
    material(0x9b3b3b, 0.5),
  );
  smile.rotation.z = Math.PI;
  smile.position.set(0, -headR * 0.2, headR * 0.9);
  head.add(smile);

  const cap = add(
    new THREE.Mesh(
      new THREE.SphereGeometry(headR * 1.07, 24, 14, 0, Math.PI * 2, 0, Math.PI * 0.56),
      hair,
    ),
    head,
  );
  cap.rotation.x = -0.35;
  if (spec.hairStyle === 'long') {
    const back = add(
      new THREE.Mesh(new THREE.CapsuleGeometry(headR * 0.85, headR * 1.3, 4, 12), hair),
      head,
    );
    back.scale.z = 0.55;
    back.position.set(0, -headR * 0.75, -headR * 0.55);
  } else if (spec.hairStyle === 'ponytail') {
    const tail = add(
      new THREE.Mesh(new THREE.CapsuleGeometry(headR * 0.28, headR * 0.9, 4, 10), hair),
      head,
    );
    tail.position.set(0, headR * 0.1, -headR * 1.15);
    tail.rotation.x = 0.5;
  }
  if (spec.sunHat) {
    const straw = material(0xe8d29a, 0.9);
    const brim = add(
      new THREE.Mesh(new THREE.CylinderGeometry(headR * 2.3, headR * 2.3, 0.012, 28), straw),
      head,
    );
    brim.position.y = headR * 0.55;
    brim.rotation.x = -0.12;
    const crown = add(
      new THREE.Mesh(
        new THREE.SphereGeometry(headR * 1.1, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2),
        straw,
      ),
      head,
    );
    crown.position.y = headR * 0.5;
    const band = add(
      new THREE.Mesh(
        new THREE.CylinderGeometry(headR * 1.11, headR * 1.11, headR * 0.25, 20, 1, true),
        material(0xc0392b),
      ),
      head,
    );
    band.position.y = headR * 0.62;
  }

  // Arms: shoulder pivot → sleeve, arm, hand.
  const makeArm = (side: number) => {
    const pivot = new THREE.Group();
    pivot.position.set(side * shoulderX, shoulderY - armR, 0);
    body.add(pivot);
    const arm = add(
      new THREE.Mesh(new THREE.CapsuleGeometry(armR, armLen - 2 * armR, 4, 8), skin),
      pivot,
    );
    arm.position.y = -armLen / 2;
    const sleeve = add(
      new THREE.Mesh(new THREE.CapsuleGeometry(armR * 1.35, armLen * 0.22, 4, 8), top),
      pivot,
    );
    sleeve.position.y = -armLen * 0.16;
    const hand = add(new THREE.Mesh(new THREE.SphereGeometry(armR * 1.35, 10, 8), skin), pivot);
    hand.position.y = -armLen;
    pivot.rotation.z = side * 0.08;
    return pivot;
  };

  return {
    group,
    body,
    head,
    torso,
    rightArm: makeArm(-1),
    leftArm: makeArm(1),
    armLength: armLen,
    shoulderY,
    shoulderX,
  };
}

/** Points an arm (shoulder pivot) so its hand reaches towards `target` (person-local). */
function aimArm(arm: THREE.Group, target: THREE.Vector3): THREE.Quaternion {
  const dir = target.clone().sub(arm.position).normalize();
  return new THREE.Quaternion().setFromUnitVectors(DOWN, dir);
}

export interface Family {
  group: THREE.Group;
  update(elapsed: number): void;
}

/**
 * Dad, son, daughter and mum standing in a row holding hands, facing
 * local +Z. Dad waves now and then, the girl hops, the boy looks around.
 */
export function createFamily(): Family {
  const group = new THREE.Group();
  group.name = 'Gia đình';

  const dad = createPerson({
    height: 1.76,
    skin: 0xe2ad84,
    hair: 0x1b1410,
    hairStyle: 'short',
    top: 0x3f9bd8,
    bottom: 0xcbb489,
  });
  const son = createPerson({
    height: 1.3,
    skin: 0xedc09a,
    hair: 0x1b1410,
    hairStyle: 'short',
    top: 0xf6c445,
    bottom: 0x2f5fa7,
  });
  const daughter = createPerson({
    height: 1.05,
    skin: 0xf0c6a4,
    hair: 0x231812,
    hairStyle: 'ponytail',
    top: 0xff9ecb,
    bottom: 0xff9ecb,
    dress: true,
  });
  const mum = createPerson({
    height: 1.63,
    skin: 0xedbf9b,
    hair: 0x2a1a12,
    hairStyle: 'long',
    top: 0xf28b82,
    bottom: 0xf28b82,
    dress: true,
    sunHat: true,
  });

  const members: [Person, number][] = [
    [dad, -1.0],
    [son, -0.34],
    [daughter, 0.26],
    [mum, 0.95],
  ];
  for (const [person, x] of members) {
    person.group.position.x = x;
    group.add(person.group);
  }

  // Join hands between neighbours: each pair's inner arms reach to a shared point.
  const joinHands = (a: Person, ax: number, b: Person, bx: number) => {
    const handHeight = (p: Person) => p.shoulderY - p.armLength * 0.93;
    const meet = new THREE.Vector3(
      (ax + bx) / 2,
      Math.min(handHeight(a), handHeight(b)) + 0.04,
      0.12,
    );
    a.leftArm.quaternion.copy(aimArm(a.leftArm, meet.clone().setX(meet.x - ax)));
    b.rightArm.quaternion.copy(aimArm(b.rightArm, meet.clone().setX(meet.x - bx)));
  };
  for (let i = 0; i < members.length - 1; i++) {
    joinHands(members[i][0], members[i][1], members[i + 1][0], members[i + 1][1]);
  }

  const restRight = dad.rightArm.quaternion.clone();
  const raised = new THREE.Quaternion().setFromUnitVectors(
    DOWN,
    new THREE.Vector3(-0.45, 0.85, 0.28).normalize(),
  );
  const wiggle = new THREE.Quaternion();
  const zAxis = new THREE.Vector3(0, 0, 1);
  const mumRest = mum.leftArm.quaternion.clone();
  const toHat = new THREE.Quaternion().setFromUnitVectors(
    DOWN,
    new THREE.Vector3(0.25, 0.95, 0.25).normalize(),
  );

  return {
    group,
    update(t) {
      // Breathing.
      members.forEach(([person], i) => {
        person.torso.scale.y = 1 + 0.015 * Math.sin(t * 1.7 + i * 1.3);
      });
      // Dad waves for ~2.5 s every 7 s.
      const cycle = t % 7;
      const wave = smoothPulse(cycle, 0.5, 3.0, 0.4);
      dad.rightArm.quaternion.slerpQuaternions(restRight, raised, wave);
      wiggle.setFromAxisAngle(zAxis, Math.sin(t * 9) * 0.35 * wave);
      dad.rightArm.quaternion.multiply(wiggle);
      dad.head.rotation.z = -0.08 * wave;
      // Mum touches her hat now and then.
      const hat = smoothPulse((t + 3.5) % 9, 0.5, 2.2, 0.5);
      mum.leftArm.quaternion.slerpQuaternions(mumRest, toHat, hat * 0.85);
      // Daughter hops on the spot.
      const hop = (t + 1) % 4 < 1.2 ? Math.abs(Math.sin(((t + 1) % 4) * Math.PI * 2.5)) : 0;
      daughter.body.position.y = hop * 0.07;
      // Son looks around.
      son.head.rotation.y = 0.45 * Math.sin(t * 0.45);
      daughter.head.rotation.z = 0.08 * Math.sin(t * 1.3);
    },
  };
}

/** 0 → 1 → 0 over [start, end] with `ramp`-second eases. */
function smoothPulse(t: number, start: number, end: number, ramp: number): number {
  const up = THREE.MathUtils.smoothstep(t, start, start + ramp);
  const down = 1 - THREE.MathUtils.smoothstep(t, end - ramp, end);
  return Math.min(up, down);
}
