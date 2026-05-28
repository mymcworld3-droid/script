survevbot

// ==UserScript==
// @name         Surviv.IO Aimbot, ESP & X-Ray
// @namespace    https://greasyfork.org/en/users/662330-zertalious
// @version      0.0.6
// @description  Aimbot, ESP and Auto-Bot for surviv.io with dynamic scaling detection.
// @author       Zertalious (Zert)
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
//🔥 新增：全自動機器人模式開關
let autobotEnabled = false; 

let lastTargetPos = null;
const predictionFactor = 2.5;

let isSpoofingTouch = false;
let lastFakeTouch = null;

let cachedRect = null;
let lastRectTime = 0;

let basePlayerSize = 142;
let currentZoomScale = 1;
let myPlayerSize = 142;
let myPos = { x: 0, y: 0 }; 

//🔥 新增：用來記錄目前假鍵盤的按壓狀態，避免重複發送事件卡死
let keyState = { 'W': false, 'A': false, 'S': false, 'D': false };
let isShooting = false;

window.toggleAimbot = function() { aimbotEnabled = !aimbotEnabled; };
window.toggleESP = function() { espEnabled = !espEnabled; };
window.toggleXRay = function() { xrayEnabled = !xrayEnabled; };
//🔥 新增：切換自動機器人的按鈕功能
window.toggleAutobot = function() { autobotEnabled = !autobotEnabled; };

//🔥 新增：模擬鍵盤按下的函式
function setKey(key, state) {
	if (keyState[key] !== state) {
		keyState[key] = state;
		const eventType = state ? 'keydown' : 'keyup';
		const eventObj = new KeyboardEvent(eventType, {
			key: key.toLowerCase(),
			code: 'Key' + key,
			keyCode: key.charCodeAt(0),
			which: key.charCodeAt(0),
			bubbles: true,
			cancelable: true,
			composed: true
		});
		window.dispatchEvent(eventObj);
	}
}

//🔥 新增：模擬滑鼠/觸控開火的函式
function setShooting(targetElement, state, x, y) {
	if (isShooting !== state) {
		isShooting = state;
		const mouseEvent = state ? 'mousedown' : 'mouseup';
		
		targetElement.dispatchEvent(new MouseEvent(mouseEvent, {
			clientX: x, clientY: y, button: 0, bubbles: true, cancelable: true, dispatchedByMe: true
		}));
		window.dispatchEvent(new MouseEvent(mouseEvent, {
			clientX: x, clientY: y, button: 0, bubbles: true, cancelable: true, dispatchedByMe: true
		}));

		if (typeof PointerEvent !== 'undefined') {
			const ptrEvent = state ? 'pointerdown' : 'pointerup';
			const ptrDict = { clientX: x, clientY: y, button: 0, pointerId: 1, pointerType: 'mouse', bubbles: true, dispatchedByMe: true };
			targetElement.dispatchEvent(new PointerEvent(ptrEvent, ptrDict));
			window.dispatchEvent(new PointerEvent(ptrEvent, ptrDict));
		}
	}
}

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

const params = {
	get() {

		console.log( 'getting ctx', this );

		return null;

	}
};

Object.defineProperty( window, 'WebGLRenderingContext', params );
Object.defineProperty( window, 'WebGL2RenderingContext', params );

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
		case 'J' : autobotEnabled = ! autobotEnabled; break; //🔥 綁定快捷鍵 J 開關機器人

	}

} );

const Context2D = CanvasRenderingContext2D.prototype;

Context2D.drawImage = new Proxy( Context2D.drawImage, {
	apply( target, thisArgs, args ) {

		if ( ( aimbotEnabled || espEnabled || autobotEnabled ) && args[ 0 ] ) {
			const src = args[ 0 ].src;

			if ( src && (src.indexOf( 'loadout' ) > - 1 || src.indexOf( 'outfit' ) > - 1 || src.indexOf( 'player' ) > - 1) ) {

				const { a, b, e, f } = thisArgs.getTransform();

				let drawHeight = 142; 
				if (args.length === 9) drawHeight = args[8];
				else if (args.length === 5) drawHeight = args[4];

				if (drawHeight > 30 && drawHeight < 300) {

					const centerX = thisArgs.canvas.width / 2;
					const centerY = thisArgs.canvas.height / 2;
					const distFromCenter = Math.hypot(e - centerX, f - centerY);

					if ( distFromCenter <= 50 ) {
						
						//🔥 確保是合理的人物大小才更新基準
						if (drawHeight >= 60 && drawHeight <= 200) {
							myPlayerSize = drawHeight;
							currentZoomScale = drawHeight / basePlayerSize;
							myPos = { x: e, y: f };
						}

					} else {

						let expectedSize = basePlayerSize * currentZoomScale;

						//🔥 極度嚴格的尺寸過濾：誤差縮小到 10% 以內 (0.1)。
						// 地上的槍枝、子彈、藥包絕對不會跟玩家一樣大，會被徹底過濾掉。
						if ( Math.abs(drawHeight - expectedSize) < (expectedSize * 0.1) ) {
							if ( Math.hypot(e - myPos.x, f - myPos.y) > 40 ) {
								radius = Math.hypot( a, b ) * drawHeight + 10;
								players.push( { x: e, y: f } );
							}
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

				players.length = 0;

				Reflect.apply( ...arguments );

				//🔥 建立一個發送觸控事件的內部輔助函式，避免重複程式碼
				const simulateTouch = (el, type, id, x, y) => {
					if (typeof PointerEvent !== 'undefined') {
						el.dispatchEvent(new PointerEvent(type, {
							pointerId: id, pointerType: 'touch', clientX: x, clientY: y, 
							bubbles: true, cancelable: true, isPrimary: (id === 88), dispatchedByMe: true
						}));
					}
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

				if (myPos.x !== 0) {
					ctx.strokeStyle = 'blue';
					ctx.lineWidth = 4;
					ctx.beginPath();
					ctx.arc(myPos.x, myPos.y, myPlayerSize / 2, 0, Math.PI * 2);
					ctx.stroke();
				}

				const targetElement = ctx.canvas ? ctx.canvas : window;

				if ( players.length === 0 ) {

					lastTargetPos = null;

					//🔥 沒人時鬆開搖桿
					if (isSpoofingRightJoy) {
						simulateTouch(targetElement, 'pointerup', 99, window.innerWidth * 0.75, window.innerHeight * 0.75);
						isSpoofingRightJoy = false;
					}
					if (isSpoofingLeftJoy) {
						simulateTouch(targetElement, 'pointerup', 88, window.innerWidth * 0.25, window.innerHeight * 0.75);
						isSpoofingLeftJoy = false;
					}

					return;

				}

				let minDistance = Infinity;
				let targetPlayer = null;

				const myCharacterX = myPos.x !== 0 ? myPos.x : ctx.canvas.width / 2;
				const myCharacterY = myPos.y !== 0 ? myPos.y : ctx.canvas.height / 2;

				for ( let i = 0; i < players.length; i ++ ) {

					const player = players[ i ];
					const distance = Math.hypot( player.x - myCharacterX, player.y - myCharacterY );

					if ( distance < minDistance ) {
						minDistance = distance;
						targetPlayer = player;
					}

				}

				if ( espEnabled && targetPlayer ) {

					ctx.lineWidth = 5;
					ctx.strokeStyle = autobotEnabled ? '#ffeb3b' : 'red';

					ctx.beginPath();
					ctx.moveTo( myCharacterX, myCharacterY );
					ctx.lineTo( targetPlayer.x, targetPlayer.y );
					ctx.stroke();

					for ( let i = 0; i < players.length; i ++ ) {
						const p = players[ i ];
						if (p !== targetPlayer) {
							ctx.strokeStyle = 'red';
							ctx.beginPath();
							ctx.moveTo( myCharacterX, myCharacterY );
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

					if ( typeof PointerEvent !== 'undefined' ) {
						
						// --- 右半邊搖桿控制（射擊與自動瞄準） ---
						const rightAngle = Math.atan2(predictY - myCharacterY, predictX - myCharacterX);
						const rJoyCenterX = window.innerWidth * 0.75;
						const rJoyCenterY = window.innerHeight * 0.75;
						
						//🔥 搖桿必須拉到足夠邊緣才會開火，這裡設定半徑 60
						const rTouchX = rJoyCenterX + Math.cos(rightAngle) * 60;
						const rTouchY = rJoyCenterY + Math.sin(rightAngle) * 60;

						if (!isSpoofingRightJoy) {
							//🔥 修正核心：必須先在「搖桿中心點」按下手指，讓遊戲設定原點
							simulateTouch(targetElement, 'pointerdown', 99, rJoyCenterX, rJoyCenterY);
							isSpoofingRightJoy = true;
						}
						//🔥 然後手指滑動到邊緣，觸發拖曳事件
						simulateTouch(targetElement, 'pointermove', 99, rTouchX, rTouchY);

						// --- 左半邊搖桿控制（走位） ---
						if (autobotEnabled) {
							
							let leftAngle = rightAngle; 
							
							if (minDistance < 230) {
								leftAngle = rightAngle + Math.PI; // 敵人太近，反向逃跑
							} else if (minDistance >= 230 && minDistance <= 420) {
								leftAngle = rightAngle + Math.PI / 2; // 安全距離，橫向繞圈
							} else {
								leftAngle = rightAngle; // 距離太遠，往前追擊
							}

							const lJoyCenterX = window.innerWidth * 0.25;
							const lJoyCenterY = window.innerHeight * 0.75;
							
							// 走位搖桿半徑拉滿 (60)
							const lTouchX = lJoyCenterX + Math.cos(leftAngle) * 60;
							const lTouchY = lJoyCenterY + Math.sin(leftAngle) * 60;

							if (!isSpoofingLeftJoy) {
								//🔥 先在左搖桿中心點按下手指
								simulateTouch(targetElement, 'pointerdown', 88, lJoyCenterX, lJoyCenterY);
								isSpoofingLeftJoy = true;
							}
							//🔥 滑動到邊緣觸發角色奔跑
							simulateTouch(targetElement, 'pointermove', 88, lTouchX, lTouchY);

						} else {
							// 手動關閉 Bot 時釋放左搖桿
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
