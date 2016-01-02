(function() {
  'use strict';
  var WIDTH = 640;
  var HEIGHT = 400;
  var SPEED = 170 * 3;

  var KEYCODES = {
    UP: 38,
    DOWN: 40,
    LEFT: 37,
    RIGHT: 39,
    SPACE: 32
  };

  var x = WIDTH / 2;
  var y = HEIGHT;
  var shouldDraw = false;

  var prevKey;
  var svg;

  var squiglyness = 2;
  var samplingRate = 0.05;
  var chaos = 1.5;

  var db;

  var CHECK = {
    x: 237,
    y: 172,
    width: 40,
    height: 20,
    jump: 1
  };

  function getOriginalImageData() {
    var levelImage = document.querySelector("#level-image");
    var hiddenCanvas = document.createElement('canvas');
    hiddenCanvas.width = WIDTH;
    hiddenCanvas.height = HEIGHT;
    hiddenCanvas.getContext('2d').drawImage(levelImage, 0, 0, WIDTH, HEIGHT);
    return hiddenCanvas.getContext('2d').getImageData(CHECK.x, CHECK.y, CHECK.width, CHECK.height);
  }

  function sameImages(image1, image2) {
    return image1.length === image2.length && image1.every(function(v, i) {
        return v === image2[i];
      });
  }

  function callOnSimilarImage(context, originalImageData, callback) {
    var INTERVAL = 200;
    var sameImage = true;

    function resembleLoop(newTimeStamp) {
      var diff = newTimeStamp - lastTimeStamp;
      if (diff > INTERVAL) {
        lastTimeStamp = newTimeStamp;
        var imageData = context.getImageData(CHECK.x, CHECK.y, CHECK.width, CHECK.height);
        if (sameImages(originalImageData.data, imageData.data)) {
          if (!sameImage) {
            sameImage = true;
            callback.call();
          }
        } else {
          sameImage = false;
        }
      }
      requestAnimationFrame(resembleLoop);
    }

    var lastTimeStamp = performance.now();
    requestAnimationFrame(resembleLoop);
  }

  function randSquig() {
    return (Math.random() - 0.5) * squiglyness;
  }

  function randChaos() {
    return (Math.random() - 0.5) * chaos;
  }


  function updateData(x1, y1, x2, y2, x3, y3, x4, y4, opacity) {
    if (!dbImage) {
      dbImage = db.push({
        date: Firebase.ServerValue.TIMESTAMP,
        data: []
      });
      dataIndex = 0;
    }
    var update = {};
    update[dataIndex] = {
      x1: x1,
      y1: y1,
      x2: x2,
      y2: y2,
      x3: x3,
      y3: y3,
      x4: x4,
      y4: y4,
      opacity: opacity
    };
    dbImage.child('data').update(update);
    dataIndex++;
  }

  function makeSquigley(x1, y1, x2, y2) {
    var xDiff = (x2 - x1) / 3;
    var yDiff = (y2 - y1) / 3;
    var dx = randSquig();
    var dy = randSquig();
    updateData(x1, y1, x1 + xDiff + dx, y1 + yDiff + dy, x1 + xDiff * 2 + dx, y1 + yDiff * 2 + dy, x2, y2, opacity);
  }

  function drawBezier(x1, y1, x2, y2, x3, y3, x4, y4, opacity) {
    opacity = opacity || 1;
    var path = 'M' + x1 + ',' + y1 + ' C' + x2 + ',' + y2 + ' ' + x3 + ',' + y3 + ' ' + x4 + ',' + y4;
    svg.path(path).attr({ 'stroke-opacity': opacity });
  }

  var dataIndex = 0;
  var opacity = 1;
  var MIN_OPACITY = 0;
  var constantCaosX;
  var constantCaosY;

  function handleKeys() {
    var pressedKeys = [];
    var lastTimeStamp;
    var looping = false;

    function loop(currentTimeStamp) {
      lastTimeStamp = lastTimeStamp || currentTimeStamp;
      var diff = (currentTimeStamp - lastTimeStamp) / 1000;
      var pressedKey = pressedKeys.slice(-1)[0];
      if (isValidDirectionKey(pressedKey)) {
        if (!looping) {
          opacity = MIN_OPACITY + (1 - MIN_OPACITY) * Math.random();
        }
        looping = true;
        if (diff > samplingRate) {
          lastTimeStamp = currentTimeStamp;
          var prevX = x;
          var prevY = y;
          if (pressedKey === prevKey) {
            if (pressedKey == KEYCODES.UP) {
              y -= diff * SPEED;
            } else if (pressedKey == KEYCODES.DOWN) {
              y += diff * SPEED;
            } else if (pressedKey == KEYCODES.LEFT) {
              x -= diff * SPEED;
            } else if (pressedKey == KEYCODES.RIGHT) {
              x += diff * SPEED;
            }
          } else {
            constantCaosX = randChaos() * 10;
            constantCaosY = randChaos() * 10;
            x += diff * SPEED * randChaos();
            y += diff * SPEED * randChaos();
          }

          x = x + randSquig() * chaos + constantCaosX;
          y = y + randSquig() * chaos + constantCaosY;
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

          if (/*shouldDraw && */pressedKey === prevKey) {
            makeSquigley(prevX, prevY, x, y, opacity);
          }

          prevKey = pressedKey;
        }
        requestAnimationFrame(loop);
      } else {
        looping = false;
      }
    }

    document.onkeydown = function(e) {
      var keyCode = e.keyCode;
      if (keyCode === KEYCODES.SPACE) {
        shouldDraw = true
      }
      if (isValidDirectionKey(keyCode)) {
        if (!looping && !pressedKeys.length) {
          lastTimeStamp = performance.now();
          requestAnimationFrame(loop);
        }
        pressedKeys.push(keyCode);
      }
    };

    document.onkeyup = function(e) {
      var keyCode = e.keyCode;

      if (keyCode === KEYCODES.SPACE) {

        shouldDraw = false
      }
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

  var dbImage;
  var currentImageKey;
  var currentIndex = 0;

  function updateImage(imageData, index) {
    if (imageData) {
      imageData.slice(index).forEach(function(data) {
        drawBezier(data.x1, data.y1, data.x2, data.y2, data.x3, data.y3, data.x4, data.y4, data.opacity);
      });
    }
  }

  function requestFullScreen(el) {
    el.style.width = '100%';
    var clientRect = el.getBoundingClientRect();
    el.style.height = HEIGHT * clientRect.width / WIDTH;
    el.style.width = clientRect.width;
    var request = (el.requestFullScreen || el.webkitRequestFullScreen || el.mozRequestFullScreen);
    request.call(el);
  }

  function setPerma(link) {
    document.querySelector("#permalink").href = link;
  }

  function restoreOnUnFull(el) {
    var prevHeight;
    var prevWidth;
    var clientRect = el.getBoundingClientRect();
    prevHeight = clientRect.height;
    prevWidth = clientRect.width;

    window.addEventListener("resize", function() {
      if (!document.isFullScreen && !document.webkitIsFullScreen && !document.mozIsFullScreen) {
        el.style.height = prevHeight + 'px';
        el.style.width = prevWidth + 'px';
      }
    });
  }

  function loadViewer(drawingSvg) {
    svg = SVG(drawingSvg).size(WIDTH, HEIGHT);

    function update(imagesSnapshot) {
      if (currentImageKey !== imagesSnapshot.key()) {
        svg.clear();
        currentIndex = 0;
        currentImageKey = imagesSnapshot.key();
        setPerma('/drawings/' + currentImageKey);
      }
      var data = imagesSnapshot.val().data;
      if (data) {
        updateImage(data, currentIndex);
        currentIndex = data.length;
      }
    }

    var path = window.location.pathname.split('/');
    if (path[path.length - 2] === 'drawings') {
      db.orderByKey()
        .equalTo(path[path.length - 1])
        .limitToLast(1)
        .on('child_changed', update);
      db.orderByKey()
        .equalTo(path[path.length - 1])
        .limitToLast(1)
        .on('child_added', update);
    } else {
      db.orderByChild('date')
        .limitToLast(1)
        .on('child_changed', update);
      db.orderByChild('date')
        .limitToLast(1)
        .on('child_added', update);
    }


    restoreOnUnFull(drawingSvg);
    document.querySelector("#full-screen-viewer").addEventListener('click', function(e) {
      e.preventDefault();
      requestFullScreen(drawingSvg);
    });

    document.querySelector("#save-as-png").addEventListener('click', function(e) {
      e.preventDefault();
      saveSvgAsPng(drawingSvg,
        'volfied.png',
        { scale: 3, backgroundColor: 'white' });
    });
  }

  function loadGame(dosboxCanvas) {

    var dosboxContext = dosboxCanvas.getContext('2d');

    var originalImageData = getOriginalImageData();
    callOnSimilarImage(dosboxContext, originalImageData, function() {
      dbImage = null;
    });

    var emulator = new Emulator(dosboxCanvas,
      null,
      new DosBoxLoader(DosBoxLoader.emulatorJS('/libs/dosbox.js'),
        DosBoxLoader.nativeResolution(WIDTH, HEIGHT),
        DosBoxLoader.mountZip("c", DosBoxLoader.fetchFile('Game File', 'libs/Volfied_1991.zip')),
        DosBoxLoader.startExe('Volfied/VOLFIED.EXE')));

    emulator.start({ waitAfterDownloading: false });

    handleKeys();


    restoreOnUnFull(dosboxCanvas);
    document.querySelector("#full-screen-dosbox").addEventListener('click', function(e) {
      e.preventDefault();
      requestFullScreen(dosboxCanvas);
    });

  }

  window.onload = function() {
    db = new Firebase("https://volfieddraw.firebaseio.com/images");
    var drawingSvg = document.querySelector("#drawing-svg");
    if (drawingSvg) {
      loadViewer(drawingSvg);
    }
    var dosboxCanvas = document.querySelector("#dosbox-canvas");
    if (dosboxCanvas) {
      loadGame(dosboxCanvas);
    }

  };
})();
