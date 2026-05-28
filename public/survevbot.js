// ==UserScript==
// @name         Surviv.IO Aimbot, ESP & X-Ray (Tablet AI Bot)
// @namespace    https://greasyfork.org/en/users/662330-zertalious
// @version      0.1.3
// @description  Advanced heuristic bot with vitality tracking (anti-static) and CQC Berserker Chase.
// @author       Zertalious (Zert) & Enhanced Logic
// @match        *://surviv.io/*
// @match        *://surviv2.io/*
// @match        *://2dbattleroyale.com/*
// @match        *://2dbattleroyale.org/*
// @match        *://piearesquared.info/*
// @match        *://thecircleisclosing.com/*
// @match        *://archimedesofsyracuse.info/*
// @match        *://secantsecant.com/*
// @match        *://parmainitiative.com/*
// @match        *://nevelskoygroup.com/*
// @match        *://kugahi.com/*
// @match        *://chandlertallowmd.com/*
// @match        *://ot38.club/*
// @match        *://kugaheavyindustry.com/*
// @match        *://drchandlertallow.com/*
// @match        *://rarepotato.com/*
// @icon         https://www.google.com/s2/favicons?domain=surviv.io
// @grant        none
// @run-at       document-start
// ==/UserScript==

let espEnabled = true;
let aimbotEnabled = true;
let xrayEnabled = true;
let autobotEnabled = false; 

let lastTargetPos = null;
const predictionFactor = 2.5;

let isSpoofingRightJoy = false;
let isSpoofingLeftJoy = false;

let cachedRect = null;
let lastRectTime = 0;

let myPlayerSize = 142;

//🔥 AI 生命特徵追蹤器陣列
let entityTrackers = [];
let nextEntityId = 1;

window.toggleAimbot = function() { aimbotEnabled = !aimbotEnabled; };
window.toggleESP = function() { espEnabled = !espEnabled; };
window.toggleXRay = function() { xrayEnabled = !xrayEnabled; };
window.toggleAutobot = function() { autobotEnabled = !autobotEnabled; };

Object.defineProperty( Object.prototype, 'textureCacheIds', {
	set( value ) {

		this._textureCacheIds = value;

		if ( Array.isArray( value ) ) {

			const scope = this;

			value.push = new Proxy( value.push, {
				apply( target, thisArgs, args ) {

					if ( args[ 0 ].indexOf( 'ceiling' ) > - 1 ) {

						Object.defineProperty( scope, 'valid', {
							set( value ) {

								this._valid = value;

							},
							get() {

								return xrayEnabled ? false : this._valid;

							}
						} );

					}

					return Reflect.apply( ...arguments );

				}
			} );

		}

	},
	get() {

		return this._textureCacheIds;

	}
} );

Object.defineProperty( window, 'WebGLRenderingContext', { get() { return null; } } );
Object.defineProperty( window, 'WebGL2RenderingContext', { get() { return null; } } );

let ctx;

HTMLCanvasElement.prototype.getContext = new Proxy( HTMLCanvasElement.prototype.getContext, {
	apply( target, thisArgs, args ) {

		const result = Reflect.apply( ...arguments );

		if ( thisArgs.parentNode ) {

			ctx = result;

		}

		return result;

	}
} );

const players = [];

let radius;

let mouseX = 0, mouseY = 0;

window.addEventListener( 'mousemove', function ( event ) {

	if ( event.dispatchedByMe !== true ) {

		mouseX = event.clientX;
		mouseY = event.clientY;

	}

} );

window.addEventListener( 'touchmove', function ( event ) {

	if ( event.dispatchedByMe !== true && event.touches.length > 0 ) {

		mouseX = event.touches[ 0 ].clientX;
		mouseY = event.touches[ 0 ].clientY;

	}

}, { passive: true } );

window.addEventListener( 'touchstart', function ( event ) {

	if ( event.dispatchedByMe !== true && event.touches.length > 0 ) {

		mouseX = event.touches[ 0 ].clientX;
		mouseY = event.touches[ 0 ].clientY;

	}

}, { passive: true } );

window.addEventListener( 'keyup', function ( event ) {

	switch ( String.fromCharCode( event.keyCode ) ) {

		case 'N' : espEnabled = ! espEnabled; break;
		case 'B' : aimbotEnabled = ! aimbotEnabled; break;
		case 'H' : xrayEnabled = ! xrayEnabled; break;
		case 'J' : autobotEnabled = ! autobotEnabled; break;

	}

} );

const Context2D = CanvasRenderingContext2D.prototype;

Context2D.drawImage = new Proxy( Context2D.drawImage, {
	apply( target, thisArgs, args ) {

		if ( ( aimbotEnabled || espEnabled || autobotEnabled ) && args[ 0 ] ) {
			
			const img = args[ 0 ];
			
			const imgWidth = img.width || 0;
			const imgHeight = img.height || 0;
			if (imgWidth > 0 && imgHeight > 0 && Math.abs(imgWidth - imgHeight) > 2) {
				return Reflect.apply( ...arguments );
			}

			const src = img.src || '';
			if (typeof src === 'string') {
				const lowerSrc = src.toLowerCase();
				if (lowerSrc.includes('petal') || lowerSrc.includes('leaf') || lowerSrc.includes('particle') || lowerSrc.includes('smoke')) {
					return Reflect.apply( ...arguments );
				}
			}

			const { a, b, e, f } = thisArgs.getTransform();

			let drawHeight = 142; 
			if (args.length === 9) drawHeight = args[8];
			else if (args.length === 5) drawHeight = args[4];

			if (drawHeight > 40 && drawHeight < 300) {

				const centerX = thisArgs.canvas.width / 2;
				const centerY = thisArgs.canvas.height / 2;
				const distFromCenter = Math.hypot(e - centerX, f - centerY);

				if ( distFromCenter <= 1 ) {
					
					if (drawHeight >= 60) {
						myPlayerSize = drawHeight;
					}

				} else {

					if ( drawHeight > myPlayerSize * 0.5 && drawHeight < myPlayerSize * 1.5 ) {
						if ( distFromCenter > 40 ) {
							radius = Math.hypot( a, b ) * drawHeight + 10;
							//🔥 加入 drawHeight 紀錄，以供後續呼吸動畫追蹤
							players.push( { x: e, y: f, h: drawHeight } );
						}
					}

				}
			}
		}

		return Reflect.apply( ...arguments );

	}
} );

window.requestAnimationFrame = new Proxy( window.requestAnimationFrame, {
	apply( target, thisArgs, args ) {

		args[ 0 ] = new Proxy( args[ 0 ], {
			apply( target, thisArgs, args ) {

				//🔥 AI 生命特徵分析器：過濾不會動的死物 (箱子、石頭)
				let currentEntities = [];
				for ( let i = 0; i < players.length; i ++ ) {
					const p = players[ i ];
					let bestMatch = null;
					let bestDist = Infinity;
					
					// 尋找上一幀的同一個目標
					for (let t of entityTrackers) {
						let d = Math.hypot(p.x - t.x, p.y - t.y);
						if (d < 50 && d < bestDist) {
							bestDist = d;
							bestMatch = t;
						}
					}
					
					if (bestMatch) {
						// 真實玩家會有呼吸動畫，尺寸會微幅變化。死物尺寸永遠不變。
						if (Math.abs(bestMatch.lastH - p.h) > 0.05) {
							bestMatch.isAlive = true; // 判定為活體玩家！
						}
						bestMatch.lastH = p.h;
						bestMatch.x = p.x;
						bestMatch.y = p.y;
						bestMatch.frames++;
						currentEntities.push(bestMatch);
					} else {
						// 新目標，先給予 30 幀的觀察期
						currentEntities.push({ id: nextEntityId++, x: p.x, y: p.y, lastH: p.h, isAlive: false, frames: 0 });
					}
				}
				entityTrackers = currentEntities;

				//🔥 絕對剔除法則：觀察期超過 30 幀且無生命特徵 (不會動/不呼吸)，直接丟棄！
				let validTargets = entityTrackers.filter(e => e.isAlive || e.frames < 30);

				players.length = 0;
				Reflect.apply( ...arguments );

				const simulateTouch = (el, type, id, x, y) => {
					if (typeof PointerEvent !== 'undefined') {
						el.dispatchEvent(new PointerEvent(type, {
							pointerId: id, pointerType: 'touch', clientX: x, clientY: y, 
							bubbles: true, cancelable: true, isPrimary: (id === 88), dispatchedByMe: true
						}));
					}
					try {
						if (typeof TouchEvent !== 'undefined' && typeof Touch !== 'undefined') {
							const tType = type.replace('pointer', 'touch');
							const touch = new Touch({ identifier: id, target: el, clientX: x, clientY: y, pageX: x, pageY: y, screenX: x, screenY: y });
							el.dispatchEvent(new TouchEvent(tType, {
								touches: [touch], targetTouches: [touch], changedTouches: [touch],
								bubbles: true, cancelable: true, dispatchedByMe: true
							}));
						}
					} catch (e) {}
				};

				ctx.fillStyle = '#fff';

				const array = [
					[ '[B] Aimbot', aimbotEnabled ],
					[ '[N] ESP', espEnabled ],
					[ '[H] X-Ray', xrayEnabled ],
					[ '[J] Auto-Bot', autobotEnabled ]
				];

				const fontSize = 20;

				ctx.textAlign = 'center';
				ctx.textBaseline = 'top';

				ctx.font = 'bolder ' + fontSize + 'px monospace';

				for ( let i = 0; i < array.length; i ++ ) {

					const [ text, status ] = array[ i ];
					ctx.globalAlpha = status ? 1 : 0.5;
					ctx.fillText( text + ': ' + ( status ? 'ON' : 'OFF' ), ctx.canvas.width / 2, 10 + i * fontSize );

				}

				ctx.globalAlpha = 1;

				const exactCenterX = ctx.canvas.width / 2;
				const exactCenterY = ctx.canvas.height / 2;

				ctx.strokeStyle = 'blue';
				ctx.lineWidth = 4;
				ctx.beginPath();
				ctx.arc(exactCenterX, exactCenterY, myPlayerSize / 2, 0, Math.PI * 2);
				ctx.stroke();

				const targetElement = ctx.canvas ? ctx.canvas : window;

				if ( validTargets.length === 0 ) {

					lastTargetPos = null;

					if (autobotEnabled) {
						
						const patrolTime = Date.now() * 0.001;
						const patrolAngle = patrolTime;
						const lJoyCenterX = window.innerWidth * 0.25;
						const lJoyCenterY = window.innerHeight * 0.75;
						const pTouchX = lJoyCenterX + Math.cos(patrolAngle) * 30; 
						const pTouchY = lJoyCenterY + Math.sin(patrolAngle) * 30;

						if (!isSpoofingLeftJoy) {
							simulateTouch(targetElement, 'pointerdown', 88, lJoyCenterX, lJoyCenterY);
							isSpoofingLeftJoy = true;
						}
						simulateTouch(targetElement, 'pointermove', 88, pTouchX, pTouchY);

						if (isSpoofingRightJoy) {
							simulateTouch(targetElement, 'pointerup', 99, window.innerWidth * 0.75, window.innerHeight * 0.75);
							isSpoofingRightJoy = false;
						}

					} else {
						if (isSpoofingRightJoy) {
							simulateTouch(targetElement, 'pointerup', 99, window.innerWidth * 0.75, window.innerHeight * 0.75);
							isSpoofingRightJoy = false;
						}
						if (isSpoofingLeftJoy) {
							simulateTouch(targetElement, 'pointerup', 88, window.innerWidth * 0.25, window.innerHeight * 0.75);
							isSpoofingLeftJoy = false;
						}
					}

					return;

				}

				let minDistance = Infinity;
				let targetPlayer = null;

				//🔥 只鎖定「會動的有效目標」
				for ( let i = 0; i < validTargets.length; i ++ ) {

					const player = validTargets[ i ];
					const distance = Math.hypot( player.x - exactCenterX, player.y - exactCenterY );

					if ( distance < minDistance ) {
						minDistance = distance;
						targetPlayer = player;
					}

				}

				if ( espEnabled && targetPlayer ) {

					ctx.lineWidth = 5;
					ctx.strokeStyle = autobotEnabled ? '#ffeb3b' : 'red';

					ctx.beginPath();
					ctx.moveTo( exactCenterX, exactCenterY );
					ctx.lineTo( targetPlayer.x, targetPlayer.y );
					ctx.stroke();

					for ( let i = 0; i < validTargets.length; i ++ ) {
						const p = validTargets[ i ];
						if (p !== targetPlayer) {
							ctx.strokeStyle = 'red';
							ctx.beginPath();
							ctx.moveTo( exactCenterX, exactCenterY );
							ctx.lineTo( p.x, p.y );
							ctx.stroke();
						}
					}

				}

				if ( (aimbotEnabled || autobotEnabled) && targetPlayer ) {
					
					let predictX = targetPlayer.x;
					let predictY = targetPlayer.y;

					if ( lastTargetPos ) {
						const velocityX = targetPlayer.x - lastTargetPos.x;
						const velocityY = targetPlayer.y - lastTargetPos.y;
						
						const moveDistance = Math.hypot(velocityX, velocityY);
						
						if ( moveDistance < 50 ) { 
							const bulletTravelTime = (minDistance / 100) * predictionFactor;
							predictX += velocityX * bulletTravelTime;
							predictY += velocityY * bulletTravelTime;
						}
					}

					lastTargetPos = { x: targetPlayer.x, y: targetPlayer.y };

					ctx.beginPath();
					ctx.strokeStyle = autobotEnabled ? '#ffeb3b' : 'red'; 
					ctx.arc( predictX, predictY, radius, 0, Math.PI * 2 );
					ctx.stroke();

					let screenX = predictX;
					let screenY = predictY;

					if (ctx.canvas) {
						const now = Date.now();
						if (!cachedRect || now - lastRectTime > 1000) {
							cachedRect = ctx.canvas.getBoundingClientRect();
							lastRectTime = now;
						}
						const scaleX = cachedRect.width / ctx.canvas.width;
						const scaleY = cachedRect.height / ctx.canvas.height;
						screenX = (predictX * scaleX) + cachedRect.left;
						screenY = (predictY * scaleY) + cachedRect.top;
					}

					targetElement.dispatchEvent( new MouseEvent( 'mousemove', { clientX: screenX, clientY: screenY, bubbles: true, dispatchedByMe: true } ) );

					if ( typeof PointerEvent !== 'undefined' || typeof TouchEvent !== 'undefined' ) {
						
						const rightAngle = Math.atan2(predictY - exactCenterY, predictX - exactCenterX);
						const rJoyCenterX = window.innerWidth * 0.75;
						const rJoyCenterY = window.innerHeight * 0.75;
						
						const rTouchX = rJoyCenterX + Math.cos(rightAngle) * 60;
						const rTouchY = rJoyCenterY + Math.sin(rightAngle) * 60;

						if (!isSpoofingRightJoy) {
							simulateTouch(targetElement, 'pointerdown', 99, rJoyCenterX, rJoyCenterY);
							isSpoofingRightJoy = true;
						}
						simulateTouch(targetElement, 'pointermove', 99, rTouchX, rTouchY);

						if (autobotEnabled) {
							
							let leftAngle = rightAngle; 
							const aiTime = Date.now() * 0.005;
							const evasiveManeuver = Math.sin(aiTime) * 0.8;
							
							//🔥 近距離狂戰士模式：如果距離小於 180，直接奪取控制權，筆直跟著他貼臉狂射！
							if (minDistance < 180) {
								leftAngle = rightAngle; // 無視走位，直線追擊
							} else if (minDistance >= 180 && minDistance <= 420) {
								leftAngle = rightAngle + (Math.PI / 2) * (Math.sin(aiTime) > 0 ? 1 : -1); 
							} else {
								leftAngle = rightAngle + evasiveManeuver * 0.5; 
							}

							const lJoyCenterX = window.innerWidth * 0.25;
							const lJoyCenterY = window.innerHeight * 0.75;
							
							const lTouchX = lJoyCenterX + Math.cos(leftAngle) * 60;
							const lTouchY = lJoyCenterY + Math.sin(leftAngle) * 60;

							if (!isSpoofingLeftJoy) {
								simulateTouch(targetElement, 'pointerdown', 88, lJoyCenterX, lJoyCenterY);
								isSpoofingLeftJoy = true;
							}
							simulateTouch(targetElement, 'pointermove', 88, lTouchX, lTouchY);

						} else {
							if (isSpoofingLeftJoy) {
								simulateTouch(targetElement, 'pointerup', 88, window.innerWidth * 0.25, window.innerHeight * 0.75);
								isSpoofingLeftJoy = false;
							}
						}
					}

				} else {
					lastTargetPos = null;
				}

			}
		} );

		return Reflect.apply( ...arguments );

	}
} );

window.addEventListener( 'DOMContentLoaded', function () {

	const shouldShowAd = false;

	const el = document.createElement( 'div' );

	el.innerHTML = `<style>

	.my-dialog {
		position: absolute;
		left: 50%;
		top: 50%;
		padding: 20px;
		background: rgba(0, 0, 0, 0.9);
		box-shadow: 0 0 0 1000vw rgba(0, 0, 0, 0.5);
		border-radius: 5px;
		color: #fff;
		transform: translate(-50%, -50%);
		text-align: center;
		z-index: 999999;
	}

	.my-dialog * {
		color: #fff;
	}

	.my-close {
		position: absolute;
		right: 5px;
		top: 5px;
		width: 20px;
		height: 20px;
		opacity: 0.5;
		cursor: pointer;
	}

	.my-close:before, .my-close:after {
		content: ' ';
		position: absolute;
		left: 50%;
		top: 50%;
		width: 100%;
		height: 20%;
		transform: translate(-50%, -50%) rotate(-45deg);
		background: #fff;
	}

	.my-close:after {
		transform: translate(-50%, -50%) rotate(45deg);
	}

	.my-close:hover {
		opacity: 1;
	}

	</style>
	<div class="my-dialog">${shouldShowAd ? `<big>Loading ad...</big>` : `<div class="my-close" onclick="this.parentNode.style.display='none';"></div>
		<big style="font-size: 2em;">Aimbot, ESP & X-Ray</big>
		<br>
		<br>
		<div style="cursor:pointer; background:#9c27b0; padding:10px; margin:5px; border-radius:5px; font-weight:bold;" onclick="window.toggleAimbot()">[點擊切換] Aimbot</div>
		<div style="cursor:pointer; background:#e91e63; padding:10px; margin:5px; border-radius:5px; font-weight:bold;" onclick="window.toggleXRay()">[點擊切換] X-Ray</div>
		<div style="cursor:pointer; background:#2196f3; padding:10px; margin:5px; border-radius:5px; font-weight:bold;" onclick="window.toggleESP()">[點擊切換] ESP</div>
		<div style="cursor:pointer; background:#ff5722; padding:10px; margin:5px; border-radius:5px; font-weight:bold;" onclick="window.toggleAutobot()">[點擊切換] Auto-Bot</div>
		<br>
		By Zertalious
		<br>
		<br>
		<div class="btn-purple btn-darken menu-option" style="position: unset !important;" onclick="window.open('https://discord.gg/K24Zxy88VM')">Discord</div>
		<div class="btn-orange btn-darken menu-option" onclick="window.open('https://www.instagram.com/zertalious/', '_blank')">Instagram</div>
		<div class="btn-blue btn-darken menu-option" onclick="window.open('https://twitter.com/Zertalious', '_blank')">Twitter</div>
		<div class="btn-green btn-darken menu-option" onclick="window.open('https://greasyfork.org/en/users/662330-zertalious', '_blank')">More scripts</div>
		` }
	</div>`;

	while ( el.children.length > 0 ) {

		document.body.appendChild( el.children[ 0 ] );

	}

} );
