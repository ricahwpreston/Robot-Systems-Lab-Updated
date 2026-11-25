(() => {
    'use strict';

    const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js';
    const ORBIT_CONTROLS_URL = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js';
    const GLTF_LOADER_URL = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js';
    const ROBOT_MODEL_URL = 'assets/robot/rover-multiview.glb';
    const MODEL_MAX_EXTENT = 3.5;

    let dependenciesPromise = null;
    let activeViewer = null;
    let viewerErrorReported = false;

    function loadScript(url, name, isLoaded) {
        if (isLoaded()) return Promise.resolve();

        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = url;
            script.async = true;
            script.dataset.robotViewerDependency = name;
            script.onload = resolve;
            script.onerror = () => reject(new Error(`Unable to load ${name} from ${url}`));
            document.head.appendChild(script);
        });
    }

    function loadDependencies() {
        if (!dependenciesPromise) {
            dependenciesPromise = loadScript(THREE_URL, 'three-js', () => Boolean(window.THREE))
                .then(() => loadScript(
                    ORBIT_CONTROLS_URL,
                    'orbit-controls',
                    () => Boolean(window.THREE && window.THREE.OrbitControls)
                ))
                .then(() => loadScript(
                    GLTF_LOADER_URL,
                    'gltf-loader',
                    () => Boolean(window.THREE && window.THREE.GLTFLoader)
                ))
                .then(() => {
                    if (!window.THREE || !window.THREE.OrbitControls || !window.THREE.GLTFLoader) {
                        throw new Error('Three.js, OrbitControls, or GLTFLoader did not expose the expected browser API.');
                    }

                    return window.THREE;
                });
        }

        return dependenciesPromise;
    }

    function prepareRobotModel(THREE, modelScene) {
        modelScene.updateMatrixWorld(true);

        const bounds = new THREE.Box3().setFromObject(modelScene);
        const size = bounds.getSize(new THREE.Vector3());
        const center = bounds.getCenter(new THREE.Vector3());
        const maxExtent = Math.max(size.x, size.y, size.z);

        if (!Number.isFinite(maxExtent) || maxExtent <= 0) {
            throw new Error('The GLB does not contain measurable robot geometry.');
        }

        const scale = MODEL_MAX_EXTENT / maxExtent;
        modelScene.scale.setScalar(scale);
        modelScene.position.copy(center.multiplyScalar(-scale));

        const robot = new THREE.Group();
        robot.name = 'Robot model';
        robot.add(modelScene);

        const scaledSize = size.multiplyScalar(scale);
        return { robot, radius: scaledSize.length() / 2 };
    }

    const WIRING_ROUTES = {
        ultrasonic: {
            label: 'Ultrasonic sensor',
            color: 0x2378b8,
            source: 'Arduino Uno footprint',
            targets: ['Ultrasonic PCB'],
            pinLabel: 'D12 / D13'
        },
        servo: {
            label: 'Scan servo',
            color: 0x2f936f,
            source: 'Arduino Uno footprint',
            targets: ['Servo'],
            pinLabel: 'D10'
        },
        ir: {
            label: 'IR obstacle sensors',
            color: 0xc28b19,
            source: 'Arduino Uno footprint',
            targets: ['IR sensor board', 'IR sensor board.001', 'Center IR board'],
            pinLabel: 'A1 / D9 / A2'
        },
        motors: {
            label: 'Motor-driver control',
            color: 0xc65b43,
            source: 'Controller shield',
            targets: ['Gearmotor', 'Gearmotor.001', 'Gearmotor.002', 'Gearmotor.003'],
            pinLabel: 'D2 / D4 / D5 / D6'
        },
        bluetooth: {
            label: 'JDY-16 Bluetooth',
            color: 0x8064b5,
            source: 'Arduino Uno footprint',
            externalOffset: [-0.72, 0.48, -0.82],
            pinLabel: 'D0 / D1',
            dashed: true,
            externalLabel: 'JDY-16 · not in GLB'
        },
        microsd: {
            label: 'MicroSD data logger',
            color: 0x9a6b31,
            source: 'Arduino Uno footprint',
            targets: ['Card socket'],
            pinLabel: 'D8 / A0 / D11 / D7',
            dashed: true
        }
    };

    function getNodeCenter(THREE, root, name) {
        const node = root.getObjectByName(name);
        if (!node) return null;

        root.updateMatrixWorld(true);
        const bounds = new THREE.Box3().setFromObject(node);
        if (!bounds.isEmpty()) return bounds.getCenter(new THREE.Vector3());

        const point = new THREE.Vector3();
        node.getWorldPosition(point);
        return point;
    }

    function createWireLine(THREE, start, end, color, dashed) {
        const lift = Math.max(start.y, end.y) + 0.16;
        const middleA = start.clone().lerp(end, 0.34);
        const middleB = start.clone().lerp(end, 0.68);
        middleA.y = lift;
        middleB.y = lift + 0.04;

        const curve = new THREE.CatmullRomCurve3([start, middleA, middleB, end]);
        const geometry = new THREE.BufferGeometry().setFromPoints(curve.getPoints(36));
        const material = dashed
            ? new THREE.LineDashedMaterial({
                color,
                dashSize: 0.07,
                gapSize: 0.045,
                transparent: true,
                opacity: 0.2,
                depthTest: false
            })
            : new THREE.LineBasicMaterial({
                color,
                transparent: true,
                opacity: 0.2,
                depthTest: false
            });

        const line = new THREE.Line(geometry, material);
        if (dashed) line.computeLineDistances();
        line.renderOrder = 20;
        return line;
    }

    function createWiringSprite(THREE, text, color) {
        const canvas = document.createElement('canvas');
        canvas.width = 640;
        canvas.height = 128;
        const context = canvas.getContext('2d');
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.fillStyle = 'rgba(15, 27, 45, 0.94)';
        context.beginPath();
        if (typeof context.roundRect === 'function') {
            context.roundRect(4, 4, 632, 120, 16);
        } else {
            context.rect(4, 4, 632, 120);
        }
        context.fill();
        context.fillStyle = `#${color.toString(16).padStart(6, '0')}`;
        context.fillRect(4, 4, 9, 120);
        context.fillStyle = '#ffffff';
        context.font = '700 42px Arial, sans-serif';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(text, 328, 65, 590);

        const texture = new THREE.CanvasTexture(canvas);
        texture.minFilter = THREE.LinearFilter;
        const material = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
            depthTest: false
        });
        const sprite = new THREE.Sprite(material);
        sprite.scale.set(0.9, 0.18, 1);
        sprite.renderOrder = 22;
        return sprite;
    }

    function createWiringMarker(THREE, position, color, wiringId, external = false) {
        const geometry = new THREE.SphereGeometry(external ? 0.075 : 0.055, 16, 12);
        const material = new THREE.MeshBasicMaterial({
            color,
            transparent: true,
            opacity: 0.58,
            depthTest: false
        });
        const marker = new THREE.Mesh(geometry, material);
        marker.position.copy(position);
        marker.userData.wiringId = wiringId;
        marker.renderOrder = 21;
        return marker;
    }

    function buildWiringOverlay(THREE, viewer) {
        const overlay = new THREE.Group();
        overlay.name = 'Firmware wiring overlay';
        const routeGroups = {};
        const markers = [];

        const sourceFallback = getNodeCenter(THREE, viewer.robot, 'Arduino Uno footprint');
        if (!sourceFallback) {
            throw new Error('The GLB does not expose the Arduino Uno footprint needed for the wiring overlay.');
        }

        const sourceMarker = createWiringMarker(
            THREE,
            sourceFallback.clone().add(new THREE.Vector3(0, 0.12, 0)),
            0x172f50,
            null
        );
        sourceMarker.scale.setScalar(1.18);
        overlay.add(sourceMarker);

        Object.entries(WIRING_ROUTES).forEach(([id, route]) => {
            const routeGroup = new THREE.Group();
            routeGroup.name = `Wiring route: ${route.label}`;
            routeGroup.userData.wiringId = id;

            const source = getNodeCenter(THREE, viewer.robot, route.source || 'Arduino Uno footprint')
                || sourceFallback;
            const start = source.clone().add(new THREE.Vector3(0, 0.1, 0));
            const endpoints = [];

            if (route.externalOffset) {
                endpoints.push({
                    point: source.clone().add(new THREE.Vector3(...route.externalOffset)),
                    external: true
                });
            } else {
                (route.targets || []).forEach(name => {
                    const point = getNodeCenter(THREE, viewer.robot, name);
                    if (point) endpoints.push({ point, external: Boolean(route.dashed) });
                });
            }

            endpoints.forEach((endpoint, index) => {
                const end = endpoint.point.clone().add(new THREE.Vector3(0, 0.1, 0));
                const line = createWireLine(THREE, start, end, route.color, Boolean(route.dashed));
                routeGroup.add(line);

                const marker = createWiringMarker(
                    THREE,
                    end,
                    route.color,
                    id,
                    endpoint.external
                );
                routeGroup.add(marker);
                markers.push(marker);

                if (index === 0) {
                    const labelPosition = start.clone().lerp(end, 0.56);
                    labelPosition.y += 0.28;
                    const label = createWiringSprite(
                        THREE,
                        endpoint.external && route.externalLabel
                            ? route.externalLabel
                            : `${route.label} · ${route.pinLabel}`,
                        route.color
                    );
                    label.position.copy(labelPosition);
                    routeGroup.add(label);
                }
            });

            if (endpoints.length) {
                routeGroups[id] = routeGroup;
                overlay.add(routeGroup);
            }
        });

        viewer.scene.add(overlay);
        viewer.wiring = { group: overlay, routes: routeGroups, markers, selection: 'ultrasonic' };
        return overlay;
    }

    function setWiringSelection(viewer, id) {
        if (!viewer.wiring || !WIRING_ROUTES[id]) {
            if (viewer) viewer.pendingWiringId = id;
            return;
        }

        viewer.wiring.selection = id;
        Object.entries(viewer.wiring.routes).forEach(([routeId, group]) => {
            const active = routeId === id;
            group.traverse(object => {
                if (object.isLine) {
                    object.material.opacity = active ? 0.96 : 0.16;
                    object.material.needsUpdate = true;
                } else if (object.isSprite) {
                    object.visible = active;
                } else if (object.isMesh && object.userData.wiringId) {
                    object.material.opacity = active ? 1 : 0.36;
                    object.scale.setScalar(active ? 1.18 : 0.82);
                    object.material.needsUpdate = true;
                }
            });
        });
    }

    function bindWiringInteraction(viewer) {
        const root = viewer.root;
        const host = viewer.host;
        const raycaster = new window.THREE.Raycaster();
        const pointer = new window.THREE.Vector2();
        let pointerStart = null;

        viewer.wiringSelectHandler = event => {
            const id = event.detail && event.detail.id;
            if (id) setWiringSelection(viewer, id);
        };
        root.addEventListener('robotlab:wiringselect', viewer.wiringSelectHandler);

        viewer.wiringPointerDownHandler = event => {
            if (event.button !== undefined && event.button !== 0) return;
            pointerStart = { x: event.clientX, y: event.clientY };
        };
        viewer.wiringPointerUpHandler = event => {
            if (!pointerStart || !viewer.wiring) return;
            const moved = Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y);
            pointerStart = null;
            if (moved > 7) return;

            const rect = host.getBoundingClientRect();
            if (!rect.width || !rect.height) return;
            pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
            viewer.scene.updateMatrixWorld(true);
            raycaster.setFromCamera(pointer, viewer.camera);
            const hits = raycaster.intersectObjects(viewer.wiring.markers, false);
            const id = hits.length ? hits[0].object.userData.wiringId : null;
            if (id) {
                root.dispatchEvent(new CustomEvent('robotlab:wiringmarker', {
                    detail: { id }
                }));
            }
        };

        host.addEventListener('pointerdown', viewer.wiringPointerDownHandler);
        host.addEventListener('pointerup', viewer.wiringPointerUpHandler);
    }

    function disposeObject(root) {
        const geometries = new Set();
        const materials = new Set();
        const textures = new Set();

        root.traverse(object => {
            if (object.geometry) geometries.add(object.geometry);
            if (object.material) {
                const objectMaterials = Array.isArray(object.material)
                    ? object.material
                    : [object.material];
                objectMaterials.forEach(material => {
                    materials.add(material);
                    Object.keys(material).forEach(key => {
                        const value = material[key];
                        if (value && value.isTexture) textures.add(value);
                    });
                });
            }
        });

        geometries.forEach(geometry => geometry.dispose());
        textures.forEach(texture => texture.dispose());
        materials.forEach(material => material.dispose());
    }

    function showViewerError(error, root) {
        const status = root && root.querySelector('[data-robot-viewer-status]');
        if (status) {
            status.hidden = false;
            status.dataset.state = 'error';
            status.textContent = 'The robot model could not load. Check the GLB asset path and internet connection, then reload the page.';
        }

        if (!viewerErrorReported) {
            console.error('Robot Systems Lab 3D viewer failed to initialize.', error);
            viewerErrorReported = true;
        }
    }

    function fitCameraToModel(THREE, viewer, radius) {
        const verticalHalfFov = viewer.camera.fov * Math.PI / 360;
        const horizontalHalfFov = Math.atan(
            Math.tan(verticalHalfFov) * viewer.camera.aspect
        );
        const halfFov = Math.min(verticalHalfFov, horizontalHalfFov);
        const distance = radius / Math.sin(halfFov) * 1.04;
        const direction = new THREE.Vector3(4.1, 3.1, 5.2).normalize();

        viewer.controls.target.set(0, 0, 0);
        viewer.camera.position.copy(direction.multiplyScalar(distance));
        viewer.controls.minDistance = Math.max(2.5, radius * 1.1);
        viewer.controls.maxDistance = Math.max(10, radius * 6);
        viewer.controls.saveState();
        viewer.controls.update();
    }

    function startRenderLoop(viewer) {
        const animate = () => {
            if (activeViewer !== viewer) return;
            viewer.frameId = window.requestAnimationFrame(animate);
            viewer.controls.update();
            viewer.renderer.render(viewer.scene, viewer.camera);
        };

        animate();
    }

    function mountViewer(root) {
        if (activeViewer) return;

        const THREE = window.THREE;
        const host = root && root.querySelector('[data-robot-viewer-canvas]');
        const status = root && root.querySelector('[data-robot-viewer-status]');
        const resetButton = root && root.querySelector('[data-robot-reset]');

        if (!THREE || !root || !host || !status || !resetButton) {
            throw new Error('The active robot viewer markup or Three.js dependency is unavailable.');
        }

        status.hidden = false;
        status.dataset.state = 'loading';
        status.textContent = 'Loading the robot model…';
        resetButton.disabled = true;

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.setClearColor(0x000000, 0);
        renderer.outputEncoding = THREE.sRGBEncoding;
        renderer.domElement.setAttribute('aria-hidden', 'true');
        host.appendChild(renderer.domElement);

        const scene = new THREE.Scene();
        scene.add(new THREE.HemisphereLight(0xffffff, 0x7d8c98, 1.35));

        const keyLight = new THREE.DirectionalLight(0xffffff, 1.8);
        keyLight.position.set(3.5, 5, 4);
        scene.add(keyLight);

        const fillLight = new THREE.DirectionalLight(0xdce9f5, .72);
        fillLight.position.set(-4, 3, -2);
        scene.add(fillLight);

        const width = Math.max(host.clientWidth, 1);
        const height = Math.max(host.clientHeight, 1);
        const camera = new THREE.PerspectiveCamera(38, width / height, .1, 100);
        camera.position.set(4.1, 3.1, 5.2);

        const controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.target.set(0, 0, 0);
        controls.enablePan = false;
        controls.enableDamping = !(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
        controls.dampingFactor = .075;
        controls.minDistance = 3.5;
        controls.maxDistance = 10;

        const viewer = {
            root,
            host,
            renderer,
            scene,
            camera,
            controls,
            robot: null,
            wiring: null,
            pendingWiringId: null,
            loadingRequest: null,
            resetButton,
            status,
            frameId: 0,
            resizeObserver: null,
            windowResizeHandler: null,
            resetButtonHandler: null
        };
        activeViewer = viewer;

        const resetCamera = () => {
            const dampingEnabled = controls.enableDamping;
            controls.enableDamping = false;
            controls.update();
            controls.reset();
            controls.update();
            controls.enableDamping = dampingEnabled;
            renderer.render(scene, camera);
        };

        const updateSize = () => {
            const nextWidth = host.clientWidth;
            const nextHeight = host.clientHeight;
            if (!nextWidth || !nextHeight) return;

            renderer.setSize(nextWidth, nextHeight, false);
            camera.aspect = nextWidth / nextHeight;
            camera.updateProjectionMatrix();
            renderer.render(scene, camera);
        };

        viewer.resetButtonHandler = resetCamera;
        resetButton.addEventListener('click', resetCamera);

        if (window.ResizeObserver) {
            viewer.resizeObserver = new window.ResizeObserver(updateSize);
            viewer.resizeObserver.observe(host);
        } else {
            viewer.windowResizeHandler = updateSize;
            window.addEventListener('resize', updateSize);
        }

        updateSize();

        const loader = new THREE.GLTFLoader();
        viewer.loadingRequest = loader.load(
            ROBOT_MODEL_URL,
            gltf => {
                viewer.loadingRequest = null;
                if (activeViewer !== viewer) {
                    disposeObject(gltf.scene);
                    return;
                }

                try {
                    const model = prepareRobotModel(THREE, gltf.scene);
                    viewer.robot = model.robot;
                    scene.add(viewer.robot);

                    if (root.hasAttribute('data-robot-wiring-viewer')) {
                        buildWiringOverlay(THREE, viewer);
                        bindWiringInteraction(viewer);
                        const initialId = root.querySelector('[data-wiring-select]')?.value || 'ultrasonic';
                        setWiringSelection(viewer, viewer.pendingWiringId || initialId);
                        fitCameraToModel(THREE, viewer, model.radius * 1.22);
                    } else {
                        fitCameraToModel(THREE, viewer, model.radius);
                    }
                    resetButton.disabled = false;
                    status.hidden = true;
                    updateSize();
                    startRenderLoop(viewer);
                } catch (error) {
                    if (!viewer.robot) disposeObject(gltf.scene);
                    if (activeViewer === viewer) destroyViewer();
                    showViewerError(error, root);
                }
            },
            undefined,
            error => {
                if (activeViewer !== viewer) return;
                viewer.loadingRequest = null;
                destroyViewer();
                showViewerError(error, root);
            }
        );
    }

    function destroyViewer() {
        if (!activeViewer) return;

        const viewer = activeViewer;
        activeViewer = null;

        window.cancelAnimationFrame(viewer.frameId);
        if (viewer.loadingRequest && typeof viewer.loadingRequest.abort === 'function') {
            viewer.loadingRequest.abort();
        }
        if (viewer.resizeObserver) viewer.resizeObserver.disconnect();
        if (viewer.windowResizeHandler) {
            window.removeEventListener('resize', viewer.windowResizeHandler);
        }

        viewer.resetButton.removeEventListener('click', viewer.resetButtonHandler);
        if (viewer.wiringSelectHandler) {
            viewer.root.removeEventListener('robotlab:wiringselect', viewer.wiringSelectHandler);
        }
        if (viewer.wiringPointerDownHandler) {
            viewer.host.removeEventListener('pointerdown', viewer.wiringPointerDownHandler);
        }
        if (viewer.wiringPointerUpHandler) {
            viewer.host.removeEventListener('pointerup', viewer.wiringPointerUpHandler);
        }
        viewer.controls.dispose();
        if (viewer.wiring && viewer.wiring.group) {
            viewer.scene.remove(viewer.wiring.group);
            disposeObject(viewer.wiring.group);
        }
        if (viewer.robot) {
            viewer.scene.remove(viewer.robot);
            disposeObject(viewer.robot);
        }
        viewer.renderer.dispose();
        viewer.renderer.forceContextLoss();
        viewer.renderer.domElement.remove();
        viewer.resetButton.disabled = true;
    }

    function isPanelVisible(panel) {
        return Boolean(panel && panel.isConnected && panel.getClientRects().length);
    }

    let desiredPanel = null;

    function handlePageChange(event) {
        const page = event && event.detail
            ? event.detail.page
            : (document.querySelector('#public-home:not([hidden])') ? 'home' : null);
        const panel = page
            ? document.querySelector(`[data-robot-viewer-panel="${page}"]`)
            : null;

        desiredPanel = panel;
        if (activeViewer && activeViewer.root !== panel) destroyViewer();
        if (!panel) {
            return;
        }

        loadDependencies()
            .then(() => {
                if (desiredPanel === panel && isPanelVisible(panel) && !activeViewer) {
                    mountViewer(panel);
                }
            })
            .catch(error => {
                if (desiredPanel === panel && isPanelVisible(panel)) {
                    showViewerError(error, panel);
                }
            });
    }

    window.addEventListener('robotlab:pagechange', handlePageChange);
    handlePageChange();
})();
