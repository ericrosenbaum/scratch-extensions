$.getScript('http://web.media.mit.edu/~ericr/scratch-extensions/three/three.js', function()
{
$.getScript('http://web.media.mit.edu/~ericr/scratch-extensions/three/OrbitControls.js', function()
{
$.getScript('http://web.media.mit.edu/~ericr/scratch-extensions/three/STLExporter.js', function()
{
$.getScript('http://web.media.mit.edu/~ericr/scratch-extensions/three/FileSaver.js', function()
{
$.getScript('http://web.media.mit.edu/~ericr/scratch-extensions/three/helvetiker_regular.typeface.js', function()
{

/*
remapping the coordinate system

red  	internal Z	beetleblocks X	(forward)
green	internal X	beetleblocks Y
blue	internal Y 	beetleblocks Z
*/
	
(function(ext) {

	console.log("v3");

	var scene = new THREE.Scene();
		
	// renderer
	var renderer = new THREE.WebGLRenderer({ alpha: true });
	var stageWidth = 480;
	var stageHeight = 360;
	var largeView = false;
	var mini = false;
	renderer.setSize(stageWidth, stageHeight);
	renderer.setClearColor( 0xCCCCCC, 1);

	// make a layer for the 3D window that sits on top of the scratch stage
	var threeLayer = document.createElement('div');
	threeLayer.id = 'three';
	threeLayer.style.position = 'absolute';
	threeLayer.style.left = '6px';
	threeLayer.style.top = '72px';
	threeLayer.style.width = '480px';
	threeLayer.style.height = '360px';
	threeLayer.style.color = '#ffffff';
	threeLayer.style.textShadow = 'none';
	document.body.appendChild(threeLayer);
	threeLayer.appendChild(renderer.domElement);
	
	var buttonLayer = document.createElement('div');
	buttonLayer.style.position = 'absolute';
	buttonLayer.style.left = '246px';
	buttonLayer.style.top = '72px';
	buttonLayer.style.width = '240px';
	buttonLayer.style.height = '30px';
	buttonLayer.style.float = 'right';
	buttonLayer.style.textShadow = 'none';
	document.body.appendChild(buttonLayer);
		
	function makeButton(name, left) {
		var newButton = document.createElement('button'); 
		newButton.innerHTML = name;
		newButton.style.height = '20px';
		newButton.style.lineHeight = '0px';
		newButton.style.padding = '2px';
		newButton.style.float = 'right';
		buttonLayer.appendChild(newButton);
		return newButton;
	}
	
	var bigButton = makeButton('big', 3);
	var miniButton = makeButton('mini', 40);
	var STLButton = makeButton('STL', 80);	
	
	bigButton.onclick = function () {
		largeView = !largeView;
		if (largeView) {
			renderer.setSize(stageWidth * 2, stageHeight * 2);
			buttonLayer.style.left = (stageWidth * 2 - 240) + 'px';
			threeLayer.style.left = '6px';
		} else {
			renderer.setSize(stageWidth, stageHeight);
			buttonLayer.style.left = '240px';
			threeLayer.style.left = '6px';
		}
	};

	miniButton.onclick = function () {
		mini = !mini;
		if (mini) {
			//renderer.setClearColor( 0x000000, 0);
			threeLayer.style.width = '120px';
			threeLayer.style.height = '90px';
			threeLayer.style.left = '366px';
			buttonLayer.style.left = '240px';
			renderer.setSize(stageWidth / 4, stageHeight / 4);
		} else {
			//renderer.setClearColor( 0xCCCCCC, 1);
			threeLayer.style.width = '480px';
			threeLayer.style.height = '360px';
			threeLayer.style.left = '6px';
			buttonLayer.style.left = '240px';
			renderer.setSize(stageWidth, stageHeight);
		}
	};
	
	STLButton.onclick = function () {
		var exporter = new THREE.STLExporter();
		var stlString = exporter.exportScene(scene);
		var blob = new Blob([stlString], {type: "text/plain;charset=utf-8"});
		saveAs(blob, "myObjects.stl"); // maybe at least add a datetime string for unique filenames?
	};
	
	
	// camera
	var camera, controls;
	resetCamera();
	
	// cone (the beetle)
	var cone = new THREE.Object3D();
	var material = new THREE.MeshLambertMaterial( { color: coneColor } );
	var coneGeometry = new THREE.CylinderGeometry( 0, 0.25, 0.7, 32);
	var coneShape = new THREE.Mesh(coneGeometry, material);
	coneShape.rotation.x = toRad(90);
	coneShape.position.z = 0.35;
	coneShape.name = "coneShape";
	cone.add(coneShape);
	scene.add(cone);
	resetCone();
	var coneColor = new THREE.Color();

	resetConeColor();
	
	function addLineToPointWithColorToObject(point, color, object) {
		geometry = new THREE.Geometry();
		geometry.vertices.push(new THREE.Vector3());
		geometry.vertices.push(point);
		var lineMaterial = new THREE.LineBasicMaterial({
			color: color
		});
		var line = new THREE.Line(geometry, lineMaterial);
		object.add(line);		
	}
	
	// beetle's local axis lines
	p = new THREE.Vector3(1,0,0);
	addLineToPointWithColorToObject(p, 0x00FF00, cone);
	p = new THREE.Vector3(0,1,0);
	addLineToPointWithColorToObject(p, 0x0000FF, cone);
	p = new THREE.Vector3(0,0,1);
	addLineToPointWithColorToObject(p, 0xFF0000, cone);
	
	// global axis lines
	p = new THREE.Vector3(5,0,0);
	addLineToPointWithColorToObject(p, 0x00FF00, scene);
	p = new THREE.Vector3(0,5,0);
	addLineToPointWithColorToObject(p, 0x0000FF, scene);
	p = new THREE.Vector3(0,0,5);
	addLineToPointWithColorToObject(p, 0xFF0000, scene);

	// the user's creation gets added to myObjects (so we can easily clear, export, etc)
	var myObjects = new THREE.Object3D();
	scene.add(myObjects);
	
	// a stack to push and pop position and rotation states
	// an array of THREE.Matrix4 objects
	// (currently not working correctly)
	var positionMatrixStack = new Array();
	
	// extrusion
	var extruding = false;
	var currentExtrusion; 
	
	// drawing
	var drawing = false;
	
	// lights
	var directionalLight = new THREE.DirectionalLight( 0xffffff, 1 );
	directionalLight.position.set( 1, 1, 0 );
	scene.add( directionalLight );

	var pointLight = new THREE.PointLight( 0xffffff, 1, 200 );
	pointLight.position.set( 10, 10, 10 );
	scene.add( pointLight );

	// renderer
	var render = function () {
		pointLight.position.copy(camera.position); // pointlight moves with the camera
		requestAnimationFrame(render);
		renderer.render(scene, camera);
	};
	render();

	// utility functions
	
	function toRad(Value) {
    	return Value * Math.PI / 180;
	}	
	function toDeg(Value) {
	   return Value * 180 / Math.PI;
	}
	
	function resetCamera() {
		camera = new THREE.PerspectiveCamera( 60, 480/360, 1, 1000 );
		camera.position.x = -5;
		camera.position.y = 7;
		camera.position.z = 5;
		camera.lookAt(new THREE.Vector3());
		controls = new THREE.OrbitControls( camera, threeLayer );
		controls.addEventListener( 'change', render );
		scene.add(camera);
	}
	
	function resetCone() {	
		cone.position.set(0,0,0);
		cone.rotation.set(0,0,0);

	}
	function resetConeColor() {	
		coneColor.setHSL(0.05,0.5,0.5);
		cone.getObjectByName("coneShape").material.color = coneColor;	
	}
	
	// blocks

	ext.clear = function() {
		scene.remove(myObjects);
		myObjects = new THREE.Object3D();
		scene.add(myObjects); 
		
		resetCone();
		resetConeColor();
		positionMatrixStack = new Array();
	};
	
	ext.goHome = function() {
	
		resetCone();
		if (extruding) {
			addPointToExtrusion();
		}
	};
	
	ext.resetCamera = function() {
		resetCamera();
	};
	
	ext.setPosition = function(x, y, z) {	
		if (drawing) {
			var p = new THREE.Vector3();
			var startPoint =  p.copy(cone.position);
		}
		x = Number(x);
		y = Number(y);
		z = Number(z);
		cone.position = new THREE.Vector3(y, z, x); 		
		if (extruding) {
			addPointToExtrusion();
		}

		if (drawing) {
			var p = new THREE.Vector3();
			var endPoint = p.copy(cone.position);
			addLineGeom(startPoint, endPoint);
		}	
	};
	
	ext.setPositionOnAxis = function(axis, pos) {
	
		if (drawing) {
			var p = new THREE.Vector3();
			var startPoint =  p.copy(cone.position);
		}
	
		pos = Number(pos);
		if (axis == 'x') {
			cone.position.z = pos;
		}
		if (axis == 'y') {
			cone.position.x = pos;
		}
		if (axis == 'z') {
			cone.position.y = pos;
		}		
		if (extruding) {
			addPointToExtrusion();
		}
		if (drawing) {
			var p = new THREE.Vector3();
			var endPoint = p.copy(cone.position);
			addLineGeom(startPoint, endPoint);
		}	
	};
	
	ext.changePositionBy = function(axis, dist) {
	
		if (drawing) {
			var p = new THREE.Vector3();
			var startPoint =  p.copy(cone.position);
		}
	
		dist = Number(dist);
		if (axis == 'x') {
			cone.position.z += dist;
		}
		if (axis == 'y') {
			cone.position.x += dist;
		}
		if (axis == 'z') {
			cone.position.y += dist;
		}	
		if (extruding) {
			addPointToExtrusion();
		}
		if (drawing) {
			var p = new THREE.Vector3();
			var endPoint = p.copy(cone.position);
			addLineGeom(startPoint, endPoint);
		}	
		
	};
	
	ext.setRotationOnAxis = function(axis, angle) {
		angle = Number(angle);
		if (axis == 'x') {
			cone.rotation.z = toRad(angle * -1);
		}
		if (axis == 'y') {
			cone.rotation.x = toRad(angle * -1);
		}
		if (axis == 'z') {
			cone.rotation.y = toRad(angle);
		}
		
		if (extruding) {
			addPointToExtrusion();
		}
	};
	
	ext.pointTowards = function(x, y, z) {
		x = Number(x);
		y = Number(y);
		z = Number(z);
		cone.lookAt(new THREE.Vector3(y, z, x));
	};
	
	function addLineGeom(startPoint, endPoint) {
		var geometry = new THREE.Geometry();
		geometry.vertices.push(startPoint);
		geometry.vertices.push(endPoint);
		var lineMaterial = new THREE.LineBasicMaterial({
			color: coneColor
		});
		var line = new THREE.Line(geometry, lineMaterial);
		myObjects.add(line);		
	}
	
	ext.move = function(dist) {
		if (drawing) {
			var p = new THREE.Vector3();
			var startPoint =  p.copy(cone.position);
		}
		dist = Number(dist);		
		cone.translateZ(dist);
		if (extruding) {
			addPointToExtrusion();
		}
		if (drawing) {
			var p = new THREE.Vector3();
			var endPoint = p.copy(cone.position);
			addLineGeom(startPoint, endPoint);
		}
	};
	
	ext.rotate = function(axis, angle) {
		angle = Number(angle);
		if (axis == 'x') {
			cone.rotateZ(toRad(angle) * -1);
		}
		if (axis == 'y') {
			cone.rotateX(toRad(angle) * -1);
		}
		if (axis == 'z') {
			cone.rotateY(toRad(angle));
		}	
	};
	

	ext.cube = function(size) {
		size = Number(size);
		addBoxGeom(size, size, size);
	};

	ext.cuboid = function(length, width, height) {
		length = Number(length);
		width = Number(width);
		height = Number(height);
		addBoxGeom(width, height, length); 
	};
	
	function addBoxGeom(length, width, height) {
		var boxGeometry = new THREE.BoxGeometry(length, width, height);
		var material = new THREE.MeshLambertMaterial( { color: coneColor } );
		var box = new THREE.Mesh(boxGeometry, material);
		box.position.copy(cone.position);
		box.rotation.copy(cone.rotation);	
		myObjects.add(box);
	}
	
	ext.sphere = function(diam) {
		diam = Number(diam);
		addSphereGeom(diam);
	};
	
	function addSphereGeom(diam) {
		var sphereGeometry = new THREE.SphereGeometry(diam/2);
		var material = new THREE.MeshLambertMaterial( { color: coneColor } );
		var sphere = new THREE.Mesh(sphereGeometry, material);
		sphere.position.copy(cone.position);
		sphere.rotation.copy(cone.rotation);	
		//sphere.position = cone.position.clone();
		//sphere.rotation = cone.rotation.clone();
		//sphere.applyMatrix(cone.matrix.clone());
		//sphere.updateMatrixWorld(true);
		myObjects.add(sphere);
	}

	ext.text = function(textString, height, depth) {
		height = Number(height);
		depth = Number(depth);
		var textGeometry = new THREE.TextGeometry(textString, {
			font: 'helvetiker',
			size: height,
			height: depth
				
		});
		var material = new THREE.MeshLambertMaterial( { color: coneColor } );
		var t = new THREE.Mesh(textGeometry, material);
		t.position.copy(cone.position);
		t.rotation.copy(cone.rotation);	
		myObjects.add(t);
	};

	// for extrusions appearing as you move:
	// tubegeometry needs to have a pre-allocated size, so
	// create a tubegeometry with 100 segments, and update the geometry as you go
	// keep track of segments and create a new tubegeometry as needed

	ext.startExtrusion = function() {
		extruding = true;
		extrusionPoints = new Array();
		addPointToExtrusion();
		addSphereGeom(1); // cap
	};
	
	ext.stopExtrusion = function() {
		if (extruding) {
			extruding = false;
			//addPointToExtrusion();
		
			var extrudeBend = new THREE.SplineCurve3(extrusionPoints);
			var path = new THREE.TubeGeometry(extrudeBend, extrusionPoints.length, 0.5, 8, false);
			var mesh = new THREE.Mesh( path, new THREE.MeshLambertMaterial( { 
				color: coneColor, 
				} ) );
			myObjects.add(mesh);
			addSphereGeom(1); // cap
		}
	};
	
	function addPointToExtrusion() {
		var p = new THREE.Vector3();
		extrusionPoints.push(p.copy(cone.position));
	}

	ext.startDrawing = function() {
		drawing = true;
	};
	
	ext.stopDrawing = function() {
		drawing = false;
	};

	ext.setHSL = function(channel, value) {
		value = Number(value);
		value %= 100; // wrap
		value /= 100; // scale from 0-100 to 0-1
		
		var hsl = coneColor.getHSL();
		if (channel == 'hue') {
			hsl.h = value;
		}
		if (channel == 'saturation') {
			hsl.s = value;
		}
		if (channel == 'lightness') {
			hsl.l = value;
		}
		coneColor.setHSL(hsl.h, hsl.s, hsl.l);
		cone.coneShape.material.color = coneColor;		
	};
	
	ext.changeHSL = function(channel, value) {	
		value = Number(value);
		value %= 100; // wrap
		value /= 100; // scale from 0-100 to 0-1
		if (channel == 'hue') {
			coneColor.offsetHSL(value,0,0);
		}
		if (channel == 'saturation') {
			coneColor.offsetHSL(0,value,0);
		}
		if (channel == 'lightness') {
			coneColor.offsetHSL(0,0,value);
		}
		cone.coneShape.material.color = coneColor;		
	};
	
	ext.getHSL = function(channel) {
		if (channel == 'hue') {
			return(coneColor.getHSL().h * 100);
		}
		if (channel == 'saturation') {
			return(coneColor.getHSL().s * 100);
		}
		if (channel == 'lightness') {
			return(coneColor.getHSL().l * 100);
		}
	};

	ext.getPosition = function(axis) {
		var pos = 0;
		if (axis == 'x') {
			pos = cone.position.z;
		}
		if (axis == 'y') {
			pos = cone.position.x;
		}
		if (axis == 'z') {
			pos = cone.position.y;
		}
		return pos;
	};

	ext.getRotation = function(axis) {
		var rot = 0;
		if (axis == 'x') {
			rot = cone.rotation.z;
		}
		if (axis == 'y') {
			rot = cone.rotation.x;
		}
		if (axis == 'z') {
			rot = cone.rotation.y;
		}
		return toDeg(rot);
	};
	
	ext.pushPosition = function() {
		positionMatrixStack.push(cone.matrix.clone());	
	};
	
	ext.popPosition = function() {
		if (positionMatrixStack.length > 0) {
			cone.matrix = new THREE.Matrix4(); 
			cone.applyMatrix(positionMatrixStack.pop());
			cone.updateMatrix();
			cone.updateMatrixWorld(true);
			if (extruding) {
				addPointToExtrusion();
			}
		}
	};

	ext.cameraPan = function(direction, dist) {
		dist = Number(dist);
		if (direction == 'up') {
			controls.pan(0, dist);
		}
		if (direction == 'right') {
			controls.pan(-1 * dist, 0);
		}
		controls.update();
	};
	
	ext.lookAt = function(target) {
		if (target == "beetle") {
			controls.target = cone.position.clone();
		} 
		if (target == "origin") {
			controls.target = new THREE.Vector3();
		}
		controls.update();
	};
	
	ext.resetAll = function() {

	};

    ext._shutdown = function() {

	};
    
    ext._getStatus = function() {
        return {status: 2, msg: 'connected'};
    };

    var descriptor = {
        blocks: [
          	[' ', 'clear',							'clear'],
          	[' ', 'go home',						'goHome'],
          	
          	[' ', 'move %n',						'move', 1],
        	[' ', 'rotate %m.axes by %n',			'rotate', 'z', 15],
        	
          	[' ', 'go to x:%n y:%n z:%n',			'setPosition', 0, 0, 0],		
          	[' ', 'set %m.axes to %n',				'setPositionOnAxis', 'x', 0],
          	[' ', 'change %m.axes by %n',			'changePositionBy', 'x', 1],
          	[' ', 'set %m.axes rotation to %n',		'setRotationOnAxis', 'z', 0],
          	[' ', 'point towards x:%n y:%n z:%n',	'pointTowards', 0, 0, 0], 			
        	['r', '%m.axes position',				'getPosition', 'x'],
        	['r', '%m.axes rotation',				'getRotation', 'z'],
        	[' ', 'push position', 					'pushPosition'],
        	[' ', 'pop position', 					'popPosition'],
          	
          	[' ', 'cube size %n',					'cube', 0.5],
        	[' ', 'cuboid l:%n w:%n h:%n',			'cuboid', 1, 0.5, 0.3], 		
        	[' ', 'sphere diameter %n',				'sphere', 0.5], 			
          	[' ', 'text %s height %n depth %n',		'text', 'hello world', 1, 0.5],
          	[' ', 'start drawing',					'startDrawing'],			// ADD
          	[' ', 'stop drawing',					'stopDrawing'],				// ADD
          	[' ', 'start extruding',				'startExtrusion'],
        	[' ', 'stop extruding',					'stopExtrusion'],
        	
        	[' ', 'set %m.hsl to %n',				'setHSL', 'hue', 50],
        	[' ', 'change %m.hsl by %n',			'changeHSL', 'hue', 10],
        	['r', 'color %m.hsl',					'getHSL', 'hue'],
        	
        	[' ', 'camera pan %m.directions %n',	'cameraPan', 'right', 10],
        	[' ', 'camera look at %m.lookat',		'lookAt', 'beetle'],
        	[' ', 'camera look at x%n y%n z%n',		'lookAtCoord', 0, 0, 0],		
          	[' ', 'reset camera',					'resetCamera'],
        	
        	],     
        menus: {
        	axes: ['x', 'y', 'z'],
        	directions: ['right', 'up'],
        	hsl: ['hue', 'saturation', 'lightness'],
        	lookat: ['beetle', 'origin']
        },
        url: ''
    };
    ScratchExtensions.register('3D', descriptor, ext);
})({});

});
});
});
});
});
