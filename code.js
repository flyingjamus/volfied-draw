(function() {
  'use strict';
  var WIDTH = 640;
  var HEIGHT = 400;
  var SPEED = 170;

  var KEYCODES = {
    UP: 38,
    DOWN: 40,
    LEFT: 37,
    RIGHT: 39
  };

  var x = WIDTH / 2;
  var y = HEIGHT;

  var prevKey;
  var svg;

  var squiglyness;
  var samplingRate;
  var chaos;

  function setParams() {
    chaos = document.querySelector("#chaos-input").value;
    squiglyness = document.querySelector("#squigly-input").value;
    samplingRate = 1 / parseInt(document.querySelector("#fps-input").value);
  }

  function randSquig() {
    return (Math.random() - 0.5) * squiglyness;
  }

  function drawSquigly(x1, y1, x2, y2, dx1, dy1, dx2, dy2) {
    var xDiff = (x2 - x1) / 3;
    var yDiff = (y2 - y1) / 3;
    dx1 = dx1 || randSquig();
    dy1 = dy1 || randSquig();
    dx2 = dx2 || randSquig();
    dy2 = dy2 || randSquig();
    drawBezier(x1, y1, x1 + xDiff + dx1, y1 + yDiff + dy1, x1 + xDiff * 2 + dx2, y1 + yDiff * 2 + dy2, x2, y2);
  }

  function drawBezier(x1, y1, x2, y2, x3, y3, x4, y4) {
    var path = 'M' + x1 + ',' + y1 + ' C' + x2 + ',' + y2 + ' ' + x3 + ',' + y3 + ' ' + x4 + ',' + y4;
    svg.path(path)
  }

  function handleKeys() {
    var pressedKeys = [];
    var lastTimeStamp;
    var looping = false;

    function loop(currentTimeStamp) {
      lastTimeStamp = lastTimeStamp || currentTimeStamp;
      var diff = (currentTimeStamp - lastTimeStamp) / 1000;
      var pressedKey = pressedKeys.slice(-1)[0];
      if (isValidDirectionKey(pressedKey)) {
        looping = true;
        if (diff > samplingRate) {

          lastTimeStamp = currentTimeStamp;
          var prevX = x;
          var prevY = y;
          var speed = pressedKey === prevKey ? SPEED : SPEED / 2;
          if (pressedKey == KEYCODES.UP) {
            y -= diff * speed;
          } else if (pressedKey == KEYCODES.DOWN) {
            y += diff * speed;
          } else if (pressedKey == KEYCODES.LEFT) {
            x -= diff * speed;
          } else if (pressedKey == KEYCODES.RIGHT) {
            x += diff * speed;
          }
          if (pressedKey !== prevKey) {
            if (prevKey === KEYCODES.UP) {
              y -= diff * speed;
            } else if (prevKey === KEYCODES.DOWN) {
              y += diff * speed;
            } else if (prevKey === KEYCODES.LEFT) {
              x -= diff * speed;
            } else if (prevKey === KEYCODES.RIGHT) {
              x += diff * speed;
            }
          }
          x = x + randSquig() * chaos;
          y = y + randSquig() * chaos;
          if (y < 0) {
            y += HEIGHT;
            prevY = HEIGHT;
          }
          if (y > HEIGHT) {
            y -= HEIGHT;
            prevY = 0;
          }
          if (x < 0) {
            x += WIDTH;
            prevX = WIDTH;
          }
          if (x > WIDTH) {
            x -= WIDTH;
            prevX = 0;
          }

          drawSquigly(prevX, prevY, x, y);
          prevKey = pressedKey;
        }
        requestAnimationFrame(loop);
      } else {
        looping = false;
      }
    }

    document.onkeydown = function(e) {
      if (isValidDirectionKey(e.keyCode)) {
        if (!looping && !pressedKeys.length) {
          lastTimeStamp = performance.now();
          requestAnimationFrame(loop);
        }
        pressedKeys.push(e.keyCode);
      }
    };

    document.onkeyup = function(e) {
      var keyCode = e.keyCode;
      if (isValidDirectionKey(keyCode)) {
        pressedKeys = pressedKeys.filter(function(key) {
          return key != keyCode;
        });
      }
    };
  }


  function isValidDirectionKey(keyCode) {
    return keyCode && keyCode >= 37 && keyCode <= 40;
  }

  window.onload = function() {


    var dosboxCanvas = document.querySelector("#dosbox-canvas");
    var drawingSvg = document.querySelector("#drawing-svg");
    svg = SVG(drawingSvg).size(WIDTH, HEIGHT);


    handleKeys();
    setParams();
    document.addEventListener('keyup', setParams);
    document.addEventListener('focusout', setParams);
    document.querySelector("#clear-btn").addEventListener('click', function() {
      svg.clear();
    });

    var emulator = new Emulator(dosboxCanvas,
      null,
      new DosBoxLoader(DosBoxLoader.emulatorJS('/libs/dosbox.js'),
        DosBoxLoader.nativeResolution(WIDTH, HEIGHT),
        DosBoxLoader.mountZip("c", DosBoxLoader.fetchFile('Game File', 'libs/Volfied_1991.zip')),
        DosBoxLoader.startExe('Volfied/VOLFIED.EXE')));
    emulator.start({ waitAfterDownloading: false });

  };
})();
