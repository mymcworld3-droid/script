// ==UserScript==
// @name         Surviv.IO Aimbot, ESP & X-Ray (Strict Symmetry Cluster)
// @namespace    https://greasyfork.org/en/users/662330-zertalious
// @version      1.0.9
// @description  Aimbot and ESP for surviv.io. Advanced validation requiring two identical hands and one larger body.
// @author       Zertalious (Zert) & Enhanced AI
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
let tempClusterBucket = [];

let radius;

let mouseX = 0, mouseY = 0;

window.addEventListener( 'mousemove', function ( event ) {

	if ( event.dispatchedByMe !== true ) {

		mouseX = event.clientX;
		mouseY = event.clientY;

	}

} );

window.addEventListener( 'keyup', function ( event ) {

	switch ( String.fromCharCode( event.keyCode ) ) {

		case 'N' : espEnabled = ! espEnabled; break;
		case 'B' : aimbotEnabled = ! aimbotEnabled; break;
		case 'H' : xrayEnabled = ! xrayEnabled; break;

	}

} );

const Context2D = CanvasRenderingContext2D.prototype;

Context2D.drawImage = new Proxy( Context2D.drawImage, {
	apply( target, thisArgs, args ) {

		if ( (aimbotEnabled || espEnabled) && args[ 0 ] ) {

			const img = args[ 0 ];

			if (img._cachedSrc === undefined) {
				let s = (typeof img.src === 'string') ? img.src.toLowerCase() : '';
				if (s.includes('map') || s.includes('floor') || s.includes('grass') || s.includes('shadow') || s.includes('tile') || s.includes('wall')) {
					s = 'ignore';
				} else {
					s = 'valid';
				}
				img._cachedSrc = s;
			}

			if ( img._cachedSrc === 'valid' ) {

				const { a, b, c, d, e, f } = thisArgs.getTransform();

				let drawWidth = 0;
				let drawHeight = 0;

				if (args.length === 9) {
					drawWidth = args[7];
					drawHeight = args[8];
				} else if (args.length === 5) {
					drawWidth = args[3];
					drawHeight = args[4];
				}

				if (drawWidth > 0 && drawHeight > 0) {
					let ratio = drawWidth / drawHeight;

					if (ratio >= 0.5 && ratio <= 1.5 && drawHeight >= 30 && drawHeight < 300) {

						const canvasW = thisArgs.canvas.width;
						const canvasH = thisArgs.canvas.height;
						const centerX = canvasW / 2;
						const centerY = canvasH / 2;

						if ( Math.abs(e - centerX) > 45 || Math.abs(f - centerY) > 45 ) {

							if ( Math.abs(b) > 0.01 ) {
								radius = Math.hypot( a, b ) * drawHeight + 10;
								tempClusterBucket.push( { x: e, y: f, h: drawHeight } );
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

				// 用於記錄已被成功配對過大核心的標記，避免同一玩家被重複塞入
				let verifiedBodyCenters = new Set();

				//🔥 嚴格非對稱對稱性群聚過濾器 (2小同尺寸 + 1大)
				for ( let i = 0; i < tempClusterBucket.length; i ++ ) {
					const b1 = tempClusterBucket[ i ];
					
					// 尋找局部小範圍內相鄰的物件
					let localNeighbors = [];
					for ( let j = 0; j < tempClusterBucket.length; j ++ ) {
						if ( i === j ) continue;
						const b2 = tempClusterBucket[ j ];
						
						if ( Math.hypot( b1.x - b2.x, b1.y - b2.y ) <= 85 ) {
							localNeighbors.push( b2 );
						}
					}

					// 如果周圍包含自己在內至少能湊滿 3 個物件，展開深度特徵排查
					if ( localNeighbors.length >= 2 ) {
						let isMatchedPlayer = false;
						let matchedLargeObj = null;

						// 將包含自己在內的所有相鄰組件放在一起分析
						let fullGroup = [ b1, ...localNeighbors ];

						// 排列組合窮舉任意三個點，確認是否符合「兩隻相同大小的手」＋「一隻大身體」
						for ( let x = 0; x < fullGroup.length; x ++ ) {
							for ( let y = x + 1; y < fullGroup.length; y ++ ) {
								for ( let z = y + 1; z < fullGroup.length; z ++ ) {
									
									let n1 = fullGroup[ x ];
									let n2 = fullGroup[ y ];
									let n3 = fullGroup[ z ];

									// 情況一：n1, n2 為相同大小的手，n3 為大身體
									if ( Math.abs( n1.h - n2.h ) <= 3 && n3.h >= n1.h + 15 && n3.h >= n2.h + 15 ) {
										isMatchedPlayer = true;
										matchedLargeObj = n3;
										break;
									}
									// 情況二：n1, n3 為相同大小的手，n2 為大身體
									if ( Math.abs( n1.h - n3.h ) <= 3 && n2.h >= n1.h + 15 && n2.h >= n3.h + 15 ) {
										isMatchedPlayer = true;
										matchedLargeObj = n2;
										break;
									}
									// 情況三：n2, n3 為相同大小的手，n1 為大身體
									if ( Math.abs( n2.h - n3.h ) <= 3 && n1.h >= n2.h + 15 && n1.h >= n3.h + 15 ) {
										isMatchedPlayer = true;
										matchedLargeObj = n1;
										break;
									}
								}
								if ( isMatchedPlayer ) break;
							}
							if ( isMatchedPlayer ) break;
						}

						// 通過兩小一同尺寸、一大的硬核過濾，且尚未標記過，則正式認定為玩家身體核心
						if ( isMatchedPlayer && matchedLargeObj ) {
							const key = `${Math.round(matchedLargeObj.x)},${Math.round(matchedLargeObj.y)}`;
							if ( ! verifiedBodyCenters.has( key ) ) {
								verifiedBodyCenters.add( key );
								players.push( { x: matchedLargeObj.x, y: matchedLargeObj.y } );
							}
						}
					}
				}

				tempClusterBucket.length = 0;

				Reflect.apply( ...arguments );

				if (!ctx) return;

				ctx.fillStyle = '#fff';

				const array = [
					[ '[B] Aimbot', aimbotEnabled ],
					[ '[N] ESP', espEnabled ],
					[ '[H] X-Ray', xrayEnabled ]
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

				if ( players.length === 0 ) {

					return;

				}

				ctx.lineWidth = 5;
				ctx.strokeStyle = 'red';

				if ( espEnabled ) {

					const centerX = ctx.canvas.width / 2;
					const centerY = ctx.canvas.height / 2;

					ctx.beginPath();

					for ( let i = 0; i < players.length; i ++ ) {

						const player = players[ i ];

						ctx.moveTo( centerX, centerY );

						ctx.lineTo( player.x, player.y );

					}

					ctx.stroke();

				}

				if ( aimbotEnabled ) {

					let minDistance = Infinity;
					let targetPlayer;

					for ( let i = 0; i < players.length; i ++ ) {

						const player = players[ i ];

						const distance = Math.hypot( player.x - mouseX, player.y - mouseY );

						if ( distance < minDistance ) {

							minDistance = distance;
							targetPlayer = player;

						}

					}

					if ( targetPlayer ) {

						ctx.beginPath();

						ctx.arc( targetPlayer.x, targetPlayer.y, radius, 0, Math.PI * 2 );

						ctx.stroke();

						window.dispatchEvent( new MouseEvent( 'mousemove', {
							clientX: targetPlayer.x,
							clientY: targetPlayer.y,
							dispatchedByMe: true
						} ) );

					}

				}

			}
		} );

		return Reflect.apply( ...arguments );

	}
} );

window.addEventListener( 'DOMContentLoaded', function () {

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
	<div class="my-dialog">
		<div class="my-close" onclick="this.parentNode.style.display='none';"></div>
		<big style="font-size: 2em;">Aimbot, ESP & X-Ray</big>
		<br>
		<br>
		[B] to toggle aimbot
		<br>
		[H] to toggle x-ray
		<br>
		[N] to toggle esp
		<br>
		<br>
		By Zertalious
		<br>
		<br>
		<div class="btn-purple btn-darken menu-option" style="position: unset !important;" onclick="window.open('https://discord.gg/K24Zxy88VM')">Discord</div>
		<div class="btn-orange btn-darken menu-option" onclick="window.open('https://www.instagram.com/zertalious/', '_blank')">Instagram</div>
		<div class="btn-blue btn-darken menu-option" onclick="window.open('https://twitter.com/Zertalious', '_blank')">Twitter</div>
		<div class="btn-green btn-darken menu-option" onclick="window.open('https://greasyfork.org/en/users/662330-zertalious', '_blank')">More scripts</div>
	</div>`;

	while ( el.children.length > 0 ) {

		document.body.appendChild( el.children[ 0 ] );

	}

} );
