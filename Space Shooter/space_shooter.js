/* 
------------------------------
------- INPUT SECTION -------- 
------------------------------
*/

/**
 * This class binds key listeners to the window and updates the controller in attached player body.
 * 
 * @typedef InputHandler
 */
class InputHandler {
	key_code_mappings = {
		button: {
			32: {key: 'space', state: 'action_1'}
		},
		axis: {
			68: {key: 'right', state: 'move_x', mod: 1},
			65: {key: 'left', state: 'move_x', mod: -1},
			87: {key: 'up', state: 'move_y', mod: -1},
			83: {key: 'down', state: 'move_y', mod: 1}
		}
	};
	player = null;

	constructor(player) {
		this.player = player;

		// bind event listeners
		window.addEventListener("keydown", (event) => this.keydown(event), false);
		window.addEventListener("keyup", (event) => this.keyup(event), false);
	}

	/**
	 * This is called every time a keydown event is thrown on the window.
	 * 
	 * @param {Object} event The keydown event
	 */
	keydown(event) {
		this.player.raw_input[event.keyCode] = true;
	}

	/**
	 * This is called every time a keyup event is thrown on the window.
	 * 
	 * @param {Object} event The keyup event
	 */
	keyup(event) {
		delete this.player.raw_input[event.keyCode];
	}

	resetController() {
		// reset all buttons to false
		for (let mapping of Object.values(this.key_code_mappings.button)) {
			this.player.controller[mapping.state] = false;
		}

		// reset all axis to zero
		for (let mapping of Object.values(this.key_code_mappings.axis)) {
			this.player.controller[mapping.state] = 0;
		}
	}

	pollController() {
		this.resetController();

		// poll all bound buttons
		for (let [key_code, mapping] of Object.entries(this.key_code_mappings.button)) {
			if (this.player.raw_input[key_code] === true) {
				this.player.controller[mapping.state] = true;
			}
		}

		// poll all bound axis
		for (let [key_code, mapping] of Object.entries(this.key_code_mappings.axis)) {
			if (this.player.raw_input[key_code] === true) {
				this.player.controller[mapping.state] += mapping.mod;
			}
		}
	}
}

/* 
------------------------------
------- BODY SECTION  -------- 
------------------------------
*/

/**
 * Represents a basic physics body in the world. It has all of the necessary information to be
 * rendered, checked for collision, updated, and removed.
 * 
 * @typedef Body
 */
class Body {
	position = {x: 0, y: 0};
	velocity = {x: 0, y: 0};
	size = {width: 10, height: 10};
	health = 100;

	/**
	 * Creates a new body with all of the default attributes
	 */
	constructor() {
		// generate and assign the next body id
		this.id = running_id++;
		// add to the entity map
		entities[this.id] = this;
	}

	/**
	 * @type {Object} An object with two properties, width and height. The passed width and height
	 * are equal to half ot the width and height of this body.
	 */
	get half_size() {
		return {
			width: this.size.width / 2,
			height: this.size.height / 2
		};
	}

	/**
	 * @returns {Boolean} true if health is less than or equal to zero, false otherwise.
	 */
	isDead() {
		return this.health <= 0;
	}

	/**
	 * Updates the position of this body using the set velocity.
	 * 
	 * @param {Number} delta_time Seconds since last update
	 */
	update(delta_time) {
		// move body
		this.position.x += delta_time * this.velocity.x;
		this.position.y += delta_time * this.velocity.y;
	}

	/**
	 * This function draws a green line in the direction of the body's velocity. The length of this
	 * line is equal to a tenth of the length of the real velocity
	 * 
	 * @param {CanvasRenderingContext2D} graphics The current graphics context.
	 */
	draw(graphics) {
		graphics.strokeStyle = '#00FF00';
		graphics.beginPath();
		graphics.moveTo(this.position.x, this.position.y);
		graphics.lineTo(this.position.x + this.velocity.x / 10, this.position.y + this.velocity.y / 10);
		graphics.stroke();
	}

	/**
	 * Marks this body to be removed at the end of the update loop
	 */
	remove() {
		queued_entities_for_removal.push(this.id);
	}
}//body

/**
 * Represents a player body. Extends a Body by handling input binding and controller management.
 * 
 * @typedef Player
 */
class Player extends Body {
	// this controller object is updated by the bound input_handler
	controller = {
		move_x: 0,
		move_y: 0,
		action_1: false
	};
	raw_input = {};
	speed = 120;
	input_handler = null;
	accumulator = 0;
	mobsKilled = 0;
	lifeTime = 0;
	mobCount = 0;


	/**
	 * Creates a new player with the default attributes.
	 */
	constructor() {
		super();
		this.type = 'Player';

		// bind the input handler to this object
		this.input_handler = new InputHandler(this);

		// we always want our new players to be at this location
		this.position = {
			x: config.canvas_size.width / 2,
			y: config.canvas_size.height - 100
		};
		this.size.width = 11
	}

	/**
	 * Draws the player as a triangle centered on the player's location.
	 * 
	 * @param {CanvasRenderingContext2D} graphics The current graphics context.
	 */
	draw(graphics) {
		var img = new Image();
		img.src = './submarine.png';
		graphics.drawImage(img, this.position.x - this.half_size.width + 1, this.position.y, 20, 25);
	}
	


	/**
	 * Updates the player given the state of the player's controller.
	 * 
	 * @param {Number} delta_time Time in seconds since last update call.
	 */
	update(delta_time) {
		this.lifeTime += delta_time;
		this.accumulator += delta_time;
		
		this.velocity.x = this.speed * this.controller.move_x;
		this.velocity.y = this.speed * this.controller.move_y; 

		if (this.controller.move_x != 0 && this.controller.move_y != 0) {
			this.velocity.x *= Math.SQRT1_2;
			this.velocity.y *= Math.SQRT1_2;
		}

		if (this.controller.action_1 == true && this.accumulator >= 1){
			new Projectile();
			this.accumulator = 0;
		}

		// update position
		super.update(delta_time);

		// clip to screen
		this.position.x = Math.min(Math.max(0, this.position.x), config.canvas_size.width);
		this.position.y = Math.min(Math.max(0, this.position.y), config.canvas_size.height);
	}
}

/**
 * Represents a Projectile body. Extends a Body for the draw and movement functionality.
 * 
 * @typedef Projectile
 */
class Projectile extends Body {
	
	//creates a new body with the Porjectile default values
	constructor() {
		super();
		this.type = 'Projectile';
		this.velocity.y = -100;
		this.acceleration = randomInt(0,6);
		this.position = {
			x: player.position.x,
			y: player.position.y - player.size.height - 3
		};
		this.size = {width: 3, height: 12};

	}

	/**
	 * Draws the Projectile as a red rectangle.
	 * 
	 * @param {CanvasRenderingContext2D} graphics The current graphics context.
	 */
	draw(graphics) {
		graphics.strokeStyle = '#cc0000';
		graphics.lineWidth = 1;
		graphics.beginPath();
		graphics.moveTo(
			this.position.x,
			this.position.y
		);
		graphics.lineTo(
			this.position.x + this.size.width,
			this.position.y
		);
		graphics.lineTo(
			this.position.x + this.size.width,
			this.position.y + this.size.height
		);
		graphics.lineTo(
			this.position.x,
			this.position.y + this.size.height
		);
		graphics.lineTo(
			this.position.x,
			this.position.y
		);
		graphics.closePath();
		graphics.fillStyle = '#ff0000';
		graphics.fill()
		graphics.stroke();
	}

	/**
	 * Updates the Projectile given the Projectiles velocity and position.
	 * 
	 * @param {Number} delta_time Time in seconds since last update call.
	 */
	update(delta_time){
		if (this.position.y <= -5){
			this.remove();
		}
		this.velocity.y -= this.acceleration;
		super.update(delta_time);
	}
}

/**
 * A class to handle creating enemies. 
 * 
 * @typedef Enemy_Spawner
 */
class Enemy_Spawner {
	accumulator = 0;
	update(delta_time){
		this.accumulator += delta_time;
		if (this.accumulator >= 5){
			new Mob;
			player.mobCount += 1;
			this.accumulator = 0;
		}

	}
}

/**
 * Represents a Mob body. Extends a Body for the draw and movement functionality.
 * 
 * @typedef Mob
 */
class Mob extends Body {
	constructor(){
		super();
		this.accumulator = 0;
		this.switchTime = .1;
		this.type = 'Mob';
		this.position = {
			x: randomInt(20, config.canvas_size.width - 20),
			y: -12
		};
		this.speed = 100;
		this.velocity.y = 100;
		this.size.width = 10;
	}
	
	/**
	 * Draws the Mob as a shark.
	 * 
	 * @param {CanvasRenderingContext2D} graphics The current graphics context.
	 */
	draw(graphics) {
		var img = new Image();
		img.src = './shark.png';
		graphics.drawImage(img, this.position.x - this.half_size.width, this.position.y, 20, 20);
	}

	/**
	 * Updates the Mob given the Mob's velocity and position.
	 * 
	 * @param {Number} delta_time Time in seconds since last update call.
	 */
	update(delta_time){
		this.accumulator += delta_time;
		if (this.position.y >= config.canvas_size.height + 5){
			this.remove();
		}
		if (this.position.x >= config.canvas_size.width - 5){
			this.velocity.x = -this.speed;
		}
		else if (this.position.x <= 5){
			this.velocity.x = this.speed;
		}
		super.update(delta_time);
		if (this.accumulator >= this.switchTime){
			this.switch();
		}
	}

	switch() {
		var x = randomInt(1,3);
		switch (x){
			case 1:
				this.velocity.x = this.speed * Math.SQRT1_2;
				this.velocity.y = this.speed * Math.SQRT1_2;
				break;
			case 2:
				this.velocity.x = -this.speed * Math.SQRT1_2;
				this.velocity.y = this.speed * Math.SQRT1_2;
				break;
			case 3:
				this.velocity.x = 0;
				this.velocity.y = this.speed;
				break;
			default:
				//do nothing
		}
		this.switchTime = randomInt(0, 2);
		this.accumulator = 0;
	}
}

/**
 * Represents a CollisionChecker. Contains an update function that checks for collisions 
 * every delta_time
 * 
 * @typedef CollissionChecker
 */
class CollissionChecker {

	/**
	 * Updates the CollisionChecker given delta_time. 
	 * 
	 * @param {Number} delta_time Time in seconds since last update call.
	 */
	update(delta_time){					//delta_time is only passed in to use the same function call as all other update functions
		for (var i = 0; i < entities.length; i++) {
			if (typeof entities[i] === 'undefined') {
				continue;
			}
			var rect1 = entities[i];
			for (var j = 0; j < entities.length; j++) {
				if (typeof entities[j] === 'undefined') {
					continue;
				}
				var rect2 = entities[j];
				if (rect1.position.x < rect2.position.x + rect2.size.width &&
					rect1.position.x + rect1.size.width > rect2.position.x &&
					rect1.position.y < rect2.position.y + rect2.size.height &&
					rect1.position.y + rect1.size.height > rect2.position.y) {
					// collision detected!
					if (rect1.type == rect2.type){
						//do nothing
					}
					else if (rect1.type == 'Player' && rect2.type == 'Mob') {
						rect1.health -= 20;
						rect2.remove();
					}
					else if (rect1.type == 'Projectile' && rect2.type == 'Mob') {
						rect2.remove();
						rect1.remove();
						player.mobsKilled += 1;
					}
				}
				
			}
		}
	}
}

//generates a random number between the given min and max.
function randomInt(min, max) {
	return Math.floor(Math.random() * (max - min + 1) + min);
  }

/* 
------------------------------
------ CONFIG SECTION -------- 
------------------------------
*/

const config = {
	graphics: {
		// set to false if you are not using a high resolution monitor
		is_hi_dpi: true
	},
	canvas_size: {
		width: 300,
		height: 500
	},
	update_rate: {
		fps: 60,
		seconds: null
	}
};

config.update_rate.seconds = 1 / config.update_rate.fps;

// grab the html span
const game_state = document.getElementById('game_state');

// grab the html canvas
const game_canvas = document.getElementById('game_canvas');
game_canvas.style.width = `${config.canvas_size.width}px`;
game_canvas.style.height = `${config.canvas_size.height}px`;

const graphics = game_canvas.getContext('2d');

// for monitors with a higher dpi
if (config.graphics.is_hi_dpi) {
	game_canvas.width = 2 * config.canvas_size.width;
	game_canvas.height = 2 * config.canvas_size.height;
	graphics.scale(2, 2);
} else {
	game_canvas.width = config.canvas_size.width;
	game_canvas.height = config.canvas_size.height;
	graphics.scale(1, 1);
}

/* 
------------------------------
------- MAIN SECTION  -------- 
------------------------------
*/

/** @type {Number} last frame time in seconds */
var last_time = null;

/** @type {Number} A counter representing the number of update calls */
var loop_count = 0;

/** @type {Number} A counter that is used to assign bodies a unique identifier */
var running_id = 0;

/** @type {Object<Number, Body>} This is a map of body ids to body instances */
var entities = null;

/** @type {Array<Number>} This is an array of body ids to remove at the end of the update */
var queued_entities_for_removal = null;

/** @type {Player} The active player */
var player = null;

/* You must implement this, assign it a value in the start() function */
var enemy_spawner = null;

/* You must implement this, assign it a value in the start() function */
var collision_handler = null;

/**
 * This function updates the state of the world given a delta time.
 * 
 * @param {Number} delta_time Time since last update in seconds.
 */
function update(delta_time) {
	// poll input
	player.input_handler.pollController();

	// move entities
	Object.values(entities).forEach(entity => {
		entity.update(delta_time);
	});

	// detect and handle collision events
	if (collision_handler != null) {
		collision_handler.update(delta_time);
	}

	// remove enemies
	queued_entities_for_removal.forEach(id => {
		delete entities[id];
	})
	queued_entities_for_removal = [];

	// spawn enemies
	if (enemy_spawner != null) {
		enemy_spawner.update(delta_time);
	}

	// allow the player to restart when dead
	if (player.isDead() && player.controller.action_1) {
		start();
	}
}

/**
 * This function draws the state of the world to the canvas.
 * 
 * @param {CanvasRenderingContext2D} graphics The current graphics context.
 */
function draw(graphics) {
	// default font config
	var score = Math.floor(30 * player.mobsKilled + player.lifeTime)
	graphics.font = "10px Arial";
	graphics.textAlign = "left";

	// draw background (this clears the screen for the next frame)
	graphics.fillStyle = '#00ddff';
	graphics.fillRect(0, 0, config.canvas_size.width, config.canvas_size.height);

	// for loop over every eneity and draw them
	Object.values(entities).forEach(entity => {
		entity.draw(graphics);
	});

	//displays the player's stats centered at the botom of the screen
	graphics.font = "12px Arial";
	graphics.textAlign = "center";
	graphics.fillStyle = '#000000';
	var time = "" + player.lifeTime;		//allows time to be displayed to only a few digits
	graphics.fillText('Enemies Defeated: 	' + player.mobsKilled, config.canvas_size.width / 2, config.canvas_size.height - 12);
	graphics.fillText('Time: 				' + time.slice(0,4), config.canvas_size.width / 2, config.canvas_size.height - 12*2);
	graphics.fillText('Total Enemies: 		' + player.mobCount, config.canvas_size.width / 2, config.canvas_size.height - 12*3);
	graphics.fillText('Score: 				' + score, config.canvas_size.width / 2, config.canvas_size.height - 12*4);

	graphics.textAlign = "right";
	graphics.fillText('Health: ' + player.health, config.canvas_size.width - 2, 13);

	// game over screen
	if (player.isDead()) {
		player.remove();
		graphics.font = "30px Arial";
		graphics.textAlign = "center";
		graphics.fillText('Game Over', config.canvas_size.width / 2, config.canvas_size.height / 2);

		graphics.font = "12px Arial";
		graphics.textAlign = "center";
		graphics.fillText('press space to restart', config.canvas_size.width / 2, 18 + config.canvas_size.height / 2);
	}
}

/**
 * This is the main driver of the game. This is called by the window requestAnimationFrame event.
 * This function calls the update and draw methods at static intervals. That means regardless of
 * how much time passed since the last time this function was called by the window the delta time
 * passed to the draw and update functions will be stable.
 * 
 * @param {Number} curr_time Current time in milliseconds
 */
function loop(curr_time) {
	// convert time to seconds
	curr_time /= 1000;

	// edge case on first loop
	if (last_time == null) {
		last_time = curr_time;
	}

	var delta_time = curr_time - last_time;

	// this allows us to make stable steps in our update functions
	while (delta_time > config.update_rate.seconds) {
		update(config.update_rate.seconds);
		draw(graphics);

		delta_time -= config.update_rate.seconds;
		last_time = curr_time;
		loop_count++;

		game_state.innerHTML = `loop count ${loop_count}`;
	}

	window.requestAnimationFrame(loop);
}

function start() {
	entities = [];
	queued_entities_for_removal = [];
	player = new Player();
	enemy_spawner = new Enemy_Spawner();
	collision_handler = new CollissionChecker();

}

// start the game
start();

// start the loop
window.requestAnimationFrame(loop);