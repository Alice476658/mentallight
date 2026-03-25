/**
 * 首页「光之书」：书脊 + 扇形发光页片 + 双层粒子（页缘星尘 + 外向发散）
 * 依赖全局 THREE；与 scene-tree 中 camera/controls 协同。
 */
(function () {
    'use strict';

    function makePetalTexture(THREE) {
        var c = document.createElement('canvas');
        c.width = 96;
        c.height = 224;
        var g = c.getContext('2d');
        var grd = g.createLinearGradient(48, 0, 48, 224);
        grd.addColorStop(0, 'rgba(255,255,255,0.95)');
        grd.addColorStop(0.25, 'rgba(180,230,255,0.72)');
        grd.addColorStop(0.55, 'rgba(60,140,220,0.38)');
        grd.addColorStop(0.82, 'rgba(20,60,120,0.22)');
        grd.addColorStop(1, 'rgba(10,30,80,0.06)');
        g.fillStyle = grd;
        g.beginPath();
        g.moveTo(48, 4);
        g.quadraticCurveTo(88, 72, 78, 210);
        g.quadraticCurveTo(48, 228, 18, 210);
        g.quadraticCurveTo(8, 72, 48, 4);
        g.fill();
        g.globalCompositeOperation = 'lighter';
        g.strokeStyle = 'rgba(200,240,255,0.35)';
        g.lineWidth = 1.2;
        g.beginPath();
        g.moveTo(48, 12);
        g.lineTo(48, 200);
        g.stroke();
        var t = new THREE.CanvasTexture(c);
        t.needsUpdate = true;
        return t;
    }

    function bendPetalGeometry(geo, bend) {
        var pos = geo.attributes.position;
        for (var i = 0; i < pos.count; i++) {
            var y = pos.getY(i);
            var t = (y + 1.4) / 2.8;
            var x = pos.getX(i);
            var curve = t * t * (1.08 + 0.35 * Math.sin(t * Math.PI));
            pos.setX(i, x + bend * curve * Math.sign(x || 1));
        }
        pos.needsUpdate = true;
        geo.computeVertexNormals();
    }

    /**
     * @param {THREE.Scene} scene
     * @param {THREE.Texture} texSoft - 粒子软点
     */
    function createBookOfLight(scene, THREE, texSoft) {
        var group = new THREE.Group();
        group.name = 'BookOfLight';

        var petalTex = makePetalTexture(THREE);
        var petalMatBase = {
            map: petalTex,
            transparent: true,
            opacity: 0.62,
            side: THREE.DoubleSide,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            color: 0xaaddff
        };

        var lotusMeshes = [];

        function addLotusTier(opts) {
            var n = opts.n;
            var y0 = opts.y0;
            var r0 = opts.r0;
            var rJ = opts.rJitter || 0.04;
            var w = opts.width;
            var h = opts.height;
            var bend = opts.bend;
            var baseRotX = opts.baseRotX;
            var phase = opts.phase || 0;
            var opBase = opts.opacity || 0.42;
            var col = opts.color != null ? opts.color : 0xaaddff;
            for (var p = 0; p < n; p++) {
                var ang = (p / n) * Math.PI * 2 + phase + (p % 3) * 0.04;
                var geo = new THREE.PlaneGeometry(w, h, 1, 9);
                bendPetalGeometry(geo, bend);
                var mat = new THREE.MeshBasicMaterial(
                    Object.assign({}, petalMatBase, {
                        opacity: opBase + (p % 5) * 0.028,
                        color: col
                    })
                );
                var mesh = new THREE.Mesh(geo, mat);
                var rr = r0 + (Math.sin(p * 2.1 + phase * 7) * 0.5 + 0.5) * rJ;
                mesh.position.set(Math.sin(ang) * rr, y0 + (p % 4) * 0.02, Math.cos(ang) * rr);
                mesh.rotation.order = 'YXZ';
                mesh.rotation.y = ang;
                mesh.rotation.x = baseRotX;
                mesh.rotation.z = Math.sin(p * 1.33 + phase) * 0.07;
                var sc = (opts.scale || 1) * (0.94 + (p % 7) * 0.018);
                mesh.scale.set(sc * (0.96 + (p % 2) * 0.06), sc, sc);
                group.add(mesh);
                lotusMeshes.push({
                    mesh: mesh,
                    baseRx: baseRotX,
                    wobble: 0.035 + (p % 5) * 0.008
                });
            }
        }

        addLotusTier({
            n: 18,
            y0: -0.32,
            r0: 0.08,
            rJitter: 0.05,
            width: 0.26,
            height: 1.12,
            bend: 0.24,
            baseRotX: -0.22,
            phase: 0.12,
            opacity: 0.5,
            color: 0xd8f4ff,
            scale: 0.95
        });
        addLotusTier({
            n: 36,
            y0: -0.48,
            r0: 0.2,
            rJitter: 0.1,
            width: 0.4,
            height: 1.88,
            bend: 0.42,
            baseRotX: -0.3,
            phase: 0.05,
            opacity: 0.38,
            color: 0xb8e8ff,
            scale: 1.06
        });
        addLotusTier({
            n: 48,
            y0: -0.55,
            r0: 0.38,
            rJitter: 0.16,
            width: 0.48,
            height: 2.35,
            bend: 0.52,
            baseRotX: -0.2,
            phase: 0.31,
            opacity: 0.3,
            color: 0x88d0ff,
            scale: 1.12
        });

        /* 莲座：自下缘外张的短页片，托住上部花冠 */
        addLotusTier({
            n: 36,
            y0: -0.92,
            r0: 0.28,
            rJitter: 0.14,
            width: 0.52,
            height: 0.48,
            bend: 0.18,
            baseRotX: 0.52,
            phase: 0.22,
            opacity: 0.45,
            color: 0x6ec8ff,
            scale: 1.02
        });
        addLotusTier({
            n: 28,
            y0: -1.05,
            r0: 0.36,
            rJitter: 0.1,
            width: 0.58,
            height: 0.4,
            bend: 0.14,
            baseRotX: 0.66,
            phase: 0.44,
            opacity: 0.38,
            color: 0x4a9cc8,
            scale: 1.04
        });

        var coverGeo = new THREE.BoxGeometry(1.85, 0.11, 1.25);
        var coverMat = new THREE.MeshBasicMaterial({
            color: 0x0a1830,
            transparent: true,
            opacity: 0.92
        });
        var coverTop = new THREE.Mesh(coverGeo, coverMat);
        coverTop.position.set(0, -1.18, 0.08);
        coverTop.rotation.x = 0.12;
        group.add(coverTop);
        var coverBot = new THREE.Mesh(coverGeo, new THREE.MeshBasicMaterial({ color: 0x060d18, transparent: true, opacity: 0.88 }));
        coverBot.position.set(0, -1.28, -0.06);
        coverBot.rotation.x = -0.1;
        group.add(coverBot);

        var DUST = 6200;
        var DRIFT = 3400;
        var dustPos = new Float32Array(DUST * 3);
        var dustBase = new Float32Array(DUST * 3);
        var dustCol = new Float32Array(DUST * 3);
        var dustPhase = new Float32Array(DUST);
        var rnd = 1;
        function rand() {
            rnd = (rnd * 1664525 + 1013904223) >>> 0;
            return rnd / 4294967296;
        }
        for (var i = 0; i < DUST; i++) {
            var u = rand();
            var v = rand();
            var theta = u * Math.PI * 2;
            var cup = Math.pow(rand(), 0.65);
            var h = -0.75 + cup * 2.35;
            var spread = Math.max(0.15, h + 0.82) * (0.95 + rand() * 0.55);
            var x = Math.sin(theta) * spread * (0.55 + rand() * 0.65);
            var y = h;
            var z = Math.cos(theta) * spread * (0.55 + rand() * 0.65);
            dustBase[i * 3] = x;
            dustBase[i * 3 + 1] = y;
            dustBase[i * 3 + 2] = z;
            dustPos[i * 3] = x;
            dustPos[i * 3 + 1] = y;
            dustPos[i * 3 + 2] = z;
            var br = 0.75 + rand() * 0.25;
            dustCol[i * 3] = 0.55 * br + rand() * 0.35;
            dustCol[i * 3 + 1] = 0.82 * br + rand() * 0.15;
            dustCol[i * 3 + 2] = 1;
            dustPhase[i] = rand() * Math.PI * 2;
        }

        var dustGeom = new THREE.BufferGeometry();
        dustGeom.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
        dustGeom.setAttribute('color', new THREE.BufferAttribute(dustCol, 3));
        var dustMat = new THREE.PointsMaterial({
            size: 0.052,
            map: texSoft,
            vertexColors: true,
            transparent: true,
            opacity: 0.88,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            sizeAttenuation: true
        });
        var dustPts = new THREE.Points(dustGeom, dustMat);
        group.add(dustPts);

        var driftPos = new Float32Array(DRIFT * 3);
        var driftVel = new Float32Array(DRIFT * 3);
        var driftCol = new Float32Array(DRIFT * 3);
        var driftLife = new Float32Array(DRIFT);
        for (var j = 0; j < DRIFT; j++) {
            resetDriftParticle(j, DRIFT, driftPos, driftVel, driftCol, driftLife, rand);
        }
        var driftGeom = new THREE.BufferGeometry();
        driftGeom.setAttribute('position', new THREE.BufferAttribute(driftPos, 3));
        driftGeom.setAttribute('color', new THREE.BufferAttribute(driftCol, 3));
        var driftMat = new THREE.PointsMaterial({
            size: 0.048,
            map: texSoft,
            vertexColors: true,
            transparent: true,
            opacity: 0.75,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            sizeAttenuation: true
        });
        var driftPts = new THREE.Points(driftGeom, driftMat);
        group.add(driftPts);

        var growthMul = 1;

        group.position.set(0, 0.38, 0);
        var baseWide = 0.82;
        group.scale.set(1.72 * baseWide, 1.4 * baseWide, 1.72 * baseWide);
        scene.add(group);

        function resetDriftParticle(j, DR, posArr, velArr, colArr, lifeArr, rfn) {
            var ry = -0.22 + rfn() * 1.42;
            var rr = 0.06 + rfn() * 0.52;
            var th = rfn() * Math.PI * 2;
            posArr[j * 3] = Math.sin(th) * rr;
            posArr[j * 3 + 1] = ry;
            posArr[j * 3 + 2] = Math.cos(th) * rr;
            var sp = 0.22 + rfn() * 0.95;
            var dx = posArr[j * 3];
            var dy = posArr[j * 3 + 1] - 0.05;
            var dz = posArr[j * 3 + 2];
            var L = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
            velArr[j * 3] = (dx / L) * sp;
            velArr[j * 3 + 1] = (dy / L) * sp * 0.92 + 0.18 + rfn() * 0.12;
            velArr[j * 3 + 2] = (dz / L) * sp;
            colArr[j * 3] = 0.65 + rfn() * 0.35;
            colArr[j * 3 + 1] = 0.85 + rfn() * 0.15;
            colArr[j * 3 + 2] = 1;
            lifeArr[j] = 2.5 + rfn() * 3.5;
        }

        function step(dt, time) {
            group.rotation.y = Math.sin(time * 0.22) * 0.045;
            var sway = Math.sin(time * 0.65) * 0.018;
            group.rotation.z = sway;

            var bloom = 0.84 + 0.16 * (0.5 + 0.5 * Math.sin(time * 0.5));
            for (var li = 0; li < lotusMeshes.length; li++) {
                var Lm = lotusMeshes[li];
                var w = Lm.wobble * Math.sin(time * 0.62 + li * 0.09);
                Lm.mesh.rotation.x = Lm.baseRx * bloom + w;
            }

            for (var i = 0; i < DUST; i++) {
                var ix = i * 3;
                var ph = dustPhase[i];
                var s = Math.sin(time * 1.15 + ph);
                var c = Math.cos(time * 0.88 + ph * 0.7);
                dustPos[ix] = dustBase[ix] + s * 0.045;
                dustPos[ix + 1] = dustBase[ix + 1] + c * 0.032;
                dustPos[ix + 2] = dustBase[ix + 2] + s * c * 0.028;
            }
            dustGeom.attributes.position.needsUpdate = true;
            dustMat.size = (0.048 + Math.sin(time * 0.9) * 0.012) * growthMul;
            driftMat.size = 0.042 * growthMul;

            for (var k = 0; k < DRIFT; k++) {
                var kx = k * 3;
                driftLife[k] -= dt;
                if (driftLife[k] <= 0) {
                    resetDriftParticle(k, DRIFT, driftPos, driftVel, driftCol, driftLife, rand);
                }
                driftPos[kx] += driftVel[kx] * dt * 1.28;
                driftPos[kx + 1] += driftVel[kx + 1] * dt * 1.28;
                driftPos[kx + 2] += driftVel[kx + 2] * dt * 1.28;
                driftVel[kx + 1] += dt * 0.035;
                var nx = Math.sin(time * 1.45 + k * 0.09) * 0.085 * dt;
                driftVel[kx] += nx;
                driftVel[kx + 2] += Math.cos(time * 1.22 + k * 0.11) * 0.085 * dt;
                var dist = driftPos[kx] * driftPos[kx] + driftPos[kx + 1] * driftPos[kx + 1] + driftPos[kx + 2] * driftPos[kx + 2];
                if (dist > 18) {
                    resetDriftParticle(k, DRIFT, driftPos, driftVel, driftCol, driftLife, rand);
                }
            }
            driftGeom.attributes.position.needsUpdate = true;
            driftGeom.attributes.color.needsUpdate = true;
        }

        function setGrowthMul(mul) {
            growthMul = Math.max(0.85, Math.min(1.45, mul || 1));
            var u = 0.82 + (growthMul - 1) * 0.34;
            group.scale.set(1.72 * u, 1.4 * u, 1.72 * u);
        }

        return {
            group: group,
            step: step,
            dustMat: dustMat,
            driftMat: driftMat,
            setGrowthMul: setGrowthMul
        };
    }

    window.MentalLightBook = {
        create: createBookOfLight
    };
})();
