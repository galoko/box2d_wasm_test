Box2D().then(main);

function main(Box2D) {
	var viewportWidth = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
	var viewportHeight = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);

	document.body.style.width = viewportWidth + "px";
	document.body.style.height = viewportHeight + "px";

	const canvas = document.getElementById("scene");
	const context = canvas.getContext('2d');
	
	const DPR = window.devicePixelRatio;
	
	canvas.width = viewportWidth * DPR;
	canvas.height = viewportHeight * DPR;
	context.scale(DPR, DPR);
	
	const DT = 1 / 120;
	
	const SCALE = 50;
	const TRANSLATE = { x: viewportWidth / 2, y: viewportHeight };
	
	const FRICTION = 0;
	const RESTITUTION = 0;
	
	const gravity = new Box2D.b2Vec2(0.0, -9.8);
	const world = new Box2D.b2World(gravity);
	world.SetContinuousPhysics(false);
	
	const CreateWall = function (x, y, width, height) {
		const position = new Box2D.b2Vec2(x, y);
		
		const wall_def = new Box2D.b2BodyDef();
		wall_def.set_position(position);
		const wall = world.CreateBody(wall_def);
		
		const shape = new Box2D.b2PolygonShape();
		shape.SetAsBox(width / 2, height / 2);
		
	    const fixture = wall.CreateFixture(shape, 0.0);
		fixture.SetRestitution(RESTITUTION);
		fixture.SetFriction(FRICTION);
		
		return wall;
	};
	
	const CreateBall = function (x, y, radius, mass, color) {
		const position = new Box2D.b2Vec2(x, y);
		
		const ball_def = new Box2D.b2BodyDef();
		ball_def.set_type(Box2D.b2_dynamicBody);
		ball_def.set_position(position);
		
		const ball = world.CreateBody(ball_def);
		
		const shape = new Box2D.b2CircleShape();
		shape.set_m_radius(radius);
		
	    const fixture = ball.CreateFixture(shape, 0);
		fixture.SetRestitution(RESTITUTION);
		fixture.SetFriction(FRICTION);
		
		const massData = new Box2D.b2MassData();
		ball.GetMassData(massData);
		massData.set_mass(mass);
		ball.SetMassData(massData);
				
		ball.color = color;
		ball.radius = radius * SCALE;
		
		return ball;
	};
	
	const toScreen = function (position) {
		return { 
			x:  position.get_x() * SCALE + TRANSLATE.x,
			y: -position.get_y() * SCALE + TRANSLATE.y
		};
	};
	
	const toWorld = function (position) {
		return new Box2D.b2Vec2(
			 (position.x - TRANSLATE.x) / SCALE, 
			-(position.y - TRANSLATE.y) / SCALE
		);
	};
	
	const Draw = function (body) {
		if (!body.radius) {
			return;
		};
		
		const screenPosition = toScreen(body.GetWorldCenter());
		
		context.beginPath();
		
		context.arc(screenPosition.x, screenPosition.y, body.radius, 
			0, Math.PI * 2, false);
			
		context.fillStyle = body.color;
		context.fill();
	};
	
	
	const GLASS_WIDTH = viewportWidth / SCALE;
	const GLASS_TALL = viewportHeight / SCALE;
	const WALL_THICKNESS = 1000 + GLASS_TALL;
	
	CreateWall(0, -WALL_THICKNESS / 2, GLASS_WIDTH * 2, WALL_THICKNESS);
	CreateWall(-(GLASS_WIDTH + WALL_THICKNESS) / 2, 0, WALL_THICKNESS, WALL_THICKNESS * 2);
	CreateWall( (GLASS_WIDTH + WALL_THICKNESS) / 2, 0, WALL_THICKNESS, WALL_THICKNESS * 2);
	CreateWall(0,  WALL_THICKNESS / 2 + GLASS_TALL, GLASS_WIDTH * 2, WALL_THICKNESS);
		
	const COLORS = [
		"#EA4335",
		"#4285F4",
		"#34A853"
	];
	
	const AREA = (viewportWidth * viewportHeight) / (SCALE * SCALE);
	const RADIUS = 0.25;
	const BALLS_COUNT = (AREA / (RADIUS * 2 * RADIUS * 2)) * 0.5;
	const STRIDE = Math.floor(GLASS_WIDTH / (RADIUS * 2));
	for (let ballNum = 0; ballNum < BALLS_COUNT; ballNum++) {
		let ballX = ballNum % STRIDE;
		let ballY = Math.floor(ballNum / STRIDE);
		
		ballX = ballX * RADIUS * 2 - GLASS_WIDTH / 2;
		ballY = 5 + ballY * RADIUS * 2 + Math.random() * 1;
		
		CreateBall(ballX, ballY, RADIUS, 1, COLORS[ballNum % COLORS.length]);
	}
	
	const ROTATE_GRAVITY = false;
	
	const bigBall = !ROTATE_GRAVITY ? CreateBall(0, 1, 1, 30, "#FBBC05") : null;
	let dst_position = null;
	
	const HandleInput = function (event) {
		let x = undefined;
		let y = undefined;
		
		if (event.clientX !== undefined && event.clientY !== undefined) {
			x = event.clientX;
			y = event.clientY;
		} else if (event.touches.length > 0) {
			x = event.touches[0].clientX;
			y = event.touches[0].clientY;
		}
		
		if (x !== undefined && y !== undefined) {
			dst_position = toWorld({ x: x, y: y });
		}
		event.preventDefault();
	};
	
	document.body.addEventListener('mousedown', HandleInput, { passive: false });
	document.body.addEventListener('mousemove', HandleInput, { passive: false });
	document.body.addEventListener('mouseup', HandleInput, { passive: false });
	
	document.body.addEventListener('touchstart', HandleInput, { passive: false });
	document.body.addEventListener('touchmove', HandleInput, { passive: false });
	document.body.addEventListener('touchend', HandleInput, { passive: false });
	
	let requestID;
	
	const HandleResize = function () {
		cancelAnimationFrame(requestID);
		
		document.body.removeEventListener('mousedown', HandleInput);
		document.body.removeEventListener('mousemove', HandleInput);
		document.body.removeEventListener('mouseup', HandleInput);
					  
		document.body.removeEventListener('touchstart', HandleInput);
		document.body.removeEventListener('touchmove', HandleInput);
		document.body.removeEventListener('touchend', HandleInput);
			
		window.removeEventListener('resize', HandleResize);
			
		setTimeout(function () {
			main(Box2D);
		}, 0);
	};
	
	window.addEventListener('resize', HandleResize);
	
	let force = new Box2D.b2Vec2(0, 0);
	const ApplyForces = function (ball) {
		if (!ball || !dst_position) {
			return;
		}
		const src_position = ball.GetWorldCenter();
		const delta = {
			x: dst_position.get_x() - src_position.get_x(),
			y: dst_position.get_y() - src_position.get_y()
		};
		
		const velocity = ball.GetLinearVelocity();
		
		const mass = ball.GetMass();
		
		const P = 300;
		const D = 30;
		
		force.set_x((delta.x * P - velocity.get_x() * D) * mass);
		force.set_y((delta.y * P - velocity.get_y() * D) * mass);
		ball.ApplyForce(force);
		ball.SetAwake(true);
	}
	
	let lastTime = performance.now();
	const Step = function () {
		const now = performance.now();
		if (now - lastTime >= DT * 1000 * 50) {
			lastTime = now;
		}
		
		if (ROTATE_GRAVITY) {
			const angle = lastTime / 1200;
			world.SetGravity(new Box2D.b2Vec2(
				Math.cos(angle) * 9.8, Math.sin(angle) * 9.8));
		}
		
		while (now - lastTime >= DT * 1000) {
			ApplyForces(bigBall);
			
			world.Step(DT, 1, 1);
			lastTime += DT * 1000;
		}
		
		// draw
		context.clearRect(0, 0, viewportWidth, viewportHeight);
		let body = world.GetBodyList();
		while (Box2D.getPointer(body)) {
			Draw(body);
			body = body.GetNext();
		}
		
		requestID = requestAnimationFrame(Step);
	};
	
	requestID = requestAnimationFrame(Step);
}