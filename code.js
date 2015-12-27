(function() {
  'use strict';
  var WIDTH = 640;
  var HEIGHT = 400;
  var SPEED = 6;
  var XPPS = 640 / SPEED;
  var YPPS = 400 / SPEED;

  var KEYCODES = {
    UP: 38,
    DOWN: 40,
    LEFT: 37,
    RIGHT: 39
  };

  var x;
  var y;

  function getOriginalImageData() {
    var levelImage = document.querySelector("#level-image");
    var hiddenCanvas = document.createElement('canvas');
    hiddenCanvas.width = WIDTH;
    hiddenCanvas.height = HEIGHT;
    hiddenCanvas.getContext('2d').drawImage(levelImage, 0, 0, WIDTH, HEIGHT);
    return hiddenCanvas.getContext('2d').getImageData(0, 0, WIDTH, HEIGHT);
  }

  function callOnSimilarImage(context, originalImageData, callback) {
    var same = false;
    var interval = 200;

    function resembleLoop(newTimeStamp) {
      var diff = newTimeStamp - lastTimeStamp;
      if (diff > interval) {
        lastTimeStamp = newTimeStamp;
        var imageData = context.getImageData(0, 0, WIDTH, HEIGHT);
        resemble(originalImageData)
          .compareTo(imageData)
          .ignoreColors()
          .onComplete(function(data) {
            if (data.misMatchPercentage >= 0.7) {
              same = false;
              interval = 200;
            } else if (!same) {
              callback.call();
              same = true;
              interval = 3000;
            }
            requestAnimationFrame(resembleLoop);
          })
      } else {
        requestAnimationFrame(resembleLoop);
      }
    }

    var lastTimeStamp = performance.now();
    requestAnimationFrame(resembleLoop);
  }

  function handleKeys(drawingContext) {
    var pressedKeys = [];
    var lastTimeStamp;
    var looping = false;

    function loop(currentTimeStamp) {
      var diff = (currentTimeStamp - lastTimeStamp) / 1000;
      var pressedKey = pressedKeys.slice(-1)[0];
      if (isValidDirectionKey(pressedKey)) {
        looping = true;
        lastTimeStamp = currentTimeStamp;

        if (pressedKey == KEYCODES.UP) {
          y -= diff * YPPS;
        } else if (pressedKey == KEYCODES.DOWN) {
          y += diff * YPPS;
        } else if (pressedKey == KEYCODES.LEFT) {
          x -= diff * XPPS;
        } else if (pressedKey == KEYCODES.RIGHT) {
          x += diff * XPPS;
        }

        x = Math.max(Math.min(x, WIDTH), 0);
        y = Math.max(Math.min(y, HEIGHT), 0);
        drawingContext.lineTo(x, y);
        drawingContext.stroke();

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
          return key !== keyCode;
        });
      }
    };
  }


  function isValidDirectionKey(keyCode) {
    return keyCode && keyCode >= 37 && keyCode <= 40;
  }


  window.onload = function() {

    var dosboxCanvas = document.querySelector("#dosbox-canvas");
    var drawingCanvas = document.querySelector("#drawing-canvas");
    var drawingContext = drawingCanvas.getContext('2d');

    drawingCanvas.width = WIDTH;
    drawingCanvas.height = HEIGHT;
    drawingContext.lineWidth = 7;
    drawingContext.strokeStyle = 'yellow';
    drawingContext.fillStyle = 'black';
    drawingContext.shadowColor = 'white';
    drawingContext.shadowBlur = 5;

    var dosboxContext = dosboxCanvas.getContext('2d');
    var originalImageData = getOriginalImageData();
    callOnSimilarImage(dosboxContext, originalImageData, resetCanvas);

    function resetCanvas() {
      drawingContext.fillRect(0, 0, WIDTH, HEIGHT);
      drawingContext.beginPath();
      x = WIDTH / 2;
      y = HEIGHT;
      drawingContext.moveTo(x, y);
    }

    resetCanvas();
    handleKeys(drawingContext);

    var emulator = new Emulator(dosboxCanvas,
      null,
      new DosBoxLoader(DosBoxLoader.emulatorJS('/libs/dosbox.js'),
        DosBoxLoader.nativeResolution(WIDTH, HEIGHT),
        DosBoxLoader.mountZip("c", DosBoxLoader.fetchFile('Game File', 'Volfied_1991.zip')),
        DosBoxLoader.startExe('Volfied/VOLFIED.EXE')));
    emulator.start({ waitAfterDownloading: false });

  };
})();