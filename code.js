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

  var squiglyness = 3;
  var samplingRate = 0.05;
  var chaos = 1.5;

  var db;

  var CHECK = {
    x: 0,
    y: 90 * 4,
    width: 40 * 4,
    height: 40 * 4,
    jump: 2
  };

  function getOriginalImageData() {
    var levelImage = document.querySelector("#level-image");
    var hiddenCanvas = document.createElement('canvas');
    hiddenCanvas.width = WIDTH;
    hiddenCanvas.height = HEIGHT;
    hiddenCanvas.getContext('2d').drawImage(levelImage, 0, 0, WIDTH, HEIGHT);
    return hiddenCanvas.getContext('2d').getImageData(0, 0, WIDTH, HEIGHT);
  }

  function sameImages(image1, image2) {
    var i;
    var j;
    var currentIndex;
    for (i = CHECK.x; i <= CHECK.x + CHECK.width; i = i + CHECK.jump) {
      for (j = CHECK.y; j <= CHECK.y + CHECK.height; j = j + CHECK.jump) {
        currentIndex = j * WIDTH * 4 + i;
        if (image1[currentIndex] !== image2[currentIndex]) {
          return false;
        }
      }
    }
    return true;
  }

  function callOnSimilarImage(context, originalImageData, callback) {
    var INTERVAL = 200;
    var sameImage = true;
    function resembleLoop(newTimeStamp) {
      var diff = newTimeStamp - lastTimeStamp;
      if (diff > INTERVAL) {
        lastTimeStamp = newTimeStamp;
        var imageData = context.getImageData(0, 0, WIDTH, HEIGHT);
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


  function setParams() {
    chaos = document.querySelector("#chaos-input").value;
    squiglyness = document.querySelector("#squigly-input").value;
    samplingRate = 1 / parseInt(document.querySelector("#fps-input").value);
  }

  function randSquig() {
    return (Math.random() - 0.5) * squiglyness;
  }

  function updateData(x1, y1, x2, y2, x3, y3, x4, y4) {
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
    };
    if (!dbImage) {
      console.log(12221312)
      dbImage = db.push({
        date: Firebase.ServerValue.TIMESTAMP,
        data: []
      });
    }
    dbImage.child('data').update(update);
  }

  function makeSquigley(x1, y1, x2, y2, dx1, dy1, dx2, dy2) {
    var xDiff = (x2 - x1) / 3;
    var yDiff = (y2 - y1) / 3;
    dx1 = dx1 || randSquig();
    dy1 = dy1 || randSquig();
    dx2 = dx2 || randSquig();
    dy2 = dy2 || randSquig();
    updateData(x1, y1, x1 + xDiff + dx1, y1 + yDiff + dy1, x1 + xDiff * 2 + dx2, y1 + yDiff * 2 + dy2, x2, y2);
  }

  function drawBezier(x1, y1, x2, y2, x3, y3, x4, y4) {
    var path = 'M' + x1 + ',' + y1 + ' C' + x2 + ',' + y2 + ' ' + x3 + ',' + y3 + ' ' + x4 + ',' + y4;
    svg.path(path)
  }

  var dataIndex = 0;

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
          dataIndex++;
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

          makeSquigley(prevX, prevY, x, y);

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

  var dbImage;
  var currentImageKey;
  var currentIndex = 0;

  function updateImage(imageData) {
    if (imageData) {
      imageData.slice(currentIndex).forEach(function(data) {
        drawBezier(data.x1, data.y1, data.x2, data.y2, data.x3, data.y3, data.x4, data.y4);
      });
      currentIndex = imageData.length;
    }
  }

  function requestFullScreen(el) {
    el.style.width = '100%';
    var clientRect = el.getBoundingClientRect();
    el.style.height = 400 * clientRect.width / 640;
    el.style.width = clientRect.width;
    var request = (el.requestFullScreen || el.webkitRequestFullScreen || el.mozRequestFullScreen);
    request.call(el);
  }

  function setPerma(link) {
    document.querySelector("#permalink").href = link;
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
      updateImage(imagesSnapshot.val().data);
    }

    var path = window.location.pathname.split('/');
    if (path[path.length - 2] === 'drawings') {
      db.orderByKey()
        .equalTo(path[path.length - 1])
        .limitToLast(1)
        .on('child_changed', update)
      db.orderByKey()
        .equalTo(path[path.length - 1])
        .limitToLast(1)
        .on('child_added', update)
    } else {
      db.orderByChild('date')
        .limitToLast(1)
        .on('child_changed', update)
      db.orderByChild('date')
        .limitToLast(1)
        .on('child_added', update)
    }

    var prevHeight;
    var prevWidth;
    var clientRect = drawingSvg.getBoundingClientRect();
    prevHeight = clientRect.height;
    prevWidth = clientRect.width;
    window.viewerFullscreen = requestFullScreen.bind(null, drawingSvg)

    window.addEventListener("resize", function() {
      if (!document.isFullScreen && !document.webkitIsFullScreen && !document.mozIsFullScreen) {
        drawingSvg.style.height = prevHeight + 'px';
        drawingSvg.style.width = prevWidth + 'px';
      }
    });
    document.querySelector("#full-screen-viewer").addEventListener('click', function(e) {
      e.preventDefault();
      requestFullScreen(drawingSvg);
    });

    document.querySelector("#save-as-png").addEventListener('click', function(e) {
      e.preventDefault();
      saveSvgAsPng(drawingSvg, 'volfied.png');
    });
  }

  function loadGame(dosboxCanvas) {

    var dosboxContext = dosboxCanvas.getContext('2d');

    var originalImageData = getOriginalImageData();
    handleKeys();

    callOnSimilarImage(dosboxContext, originalImageData, function() {
      dbImage = null;
      dataIndex = 0;
    });

    var emulator = new Emulator(dosboxCanvas,
      null,
      new DosBoxLoader(DosBoxLoader.emulatorJS('/libs/dosbox.js'),
        DosBoxLoader.nativeResolution(WIDTH, HEIGHT),
        DosBoxLoader.mountZip("c", DosBoxLoader.fetchFile('Game File', 'libs/Volfied_1991.zip')),
        DosBoxLoader.startExe('Volfied/VOLFIED.EXE')));
    emulator.start({ waitAfterDownloading: false });

    var prevHeight;
    var prevWidth;
    var clientRect = dosboxCanvas.getBoundingClientRect();
    prevHeight = clientRect.height;
    prevWidth = clientRect.width;

    document.querySelector("#full-screen-dosbox").addEventListener('click', function(e) {
      e.preventDefault();
      requestFullScreen(dosboxCanvas);
    });

    window.addEventListener("resize", function() {
      if (!document.isFullScreen && !document.webkitIsFullScreen && !document.mozIsFullScreen) {
        dosboxCanvas.style.height = prevHeight + 'px';
        dosboxCanvas.style.width = prevWidth + 'px';
      }
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
