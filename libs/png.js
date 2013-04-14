/**
 * (c) scalable minds 2013 | MIT license | Author: Norman Rzepka (normanrz)
 *
 * Library for decoding and encoding of pngs. 
 * Works in web workers. Intended to be used with HTML5 canvas, but doesn't require it.
 *
 * Builds upon zlib.js from Yuta Imaya
 * https://github.com/imaya/zlib.js
 *
 * PNG#encode inspired by as3corelib library from Adobe
 * https://github.com/mikechambers/as3corelib/blob/master/src/com/adobe/images/PNGEncoder.as
 */

var PNG = (function() {

  function concatBuffers(parts) {

    var totalLength = parts.reduce(function (r, a) { 
      return r + a.byteLength; 
    }, 0);

    var pointer = 0;
    var result = new Uint8Array(totalLength);

    parts.forEach(function (a) {
      if (a instanceof Uint8Array)
        result.set(a, pointer);
      else
        result.set(new Uint8Array(a.buffer, a.byteOffset, a.byteLength), pointer)
      pointer += a.byteLength;
    });

    return result;
  }

  function encode(img) {
  
    var png = [];
    // PNG signature
    png.push(new Uint32Array([ 0x474e5089, 0x0A1A0A0D ]));
    
    // IHDR chunk
    var IHDR = new DataView(new ArrayBuffer(13))
    IHDR.setUint32(0, img.width, false);
    IHDR.setUint32(4, img.height, false);
    IHDR.setUint32(8, 0x00000608, true);
    IHDR.setUint8(12, 0)
    png.push(writeChunk(0x49484452, IHDR));
    
    // Build IDAT chunk
    var IDAT = new Uint8Array(img.height * (1 + 4 * img.width));

    for (var i = 0; i < img.height; i++) {
      IDAT.set(img.data.subarray(i * 4 * img.width, (i + 1) * 4 * img.width), (img.width * 4 + 1) * i + 1);
    }

    var deflate = new Zlib.Deflate(IDAT);
    png.push(writeChunk(0x49444154, deflate.compress()));
    // Build IEND chunk
    png.push(writeChunk(0x49454E44, new Uint8Array(0)));

    // return PNG
    return concatBuffers(png);

  }

  function cropImage(img, x, y, w, h) {

    w = Math.min(img.width - x, w);
    h = Math.min(img.height - y, h);

    var output = {
      width : w,
      height : h,
      data : new Uint8Array(w * h * 4)
    };

    var outputBuffer = output.data;
    var inputBuffer = img.data;

    var pointer = 0;
    for (var i = y; i < y + h; i++) {
      outputBuffer.set(inputBuffer.subarray(4 * (i * img.width + x), 4 * (i * img.width + x + w)), pointer);
      pointer += 4 * w;
    }

    return output;
  }

  function decode(data) {

    var dataView = new DataView(data.buffer);
    
    var img = {};
    img.width = dataView.getUint32(16, false);
    img.height = dataView.getUint32(20, false);

    var IHDRlength = dataView.getUint32(8, false);
    var IDATs = [];

    var pos = 16 + IHDRlength + 4;
    while (pos <= data.byteLength && dataView.getUint32(pos + 4, false) == 0x49444154) {
      var length = dataView.getUint32(pos, false);
      IDATs.push(data.subarray(pos + 8, pos + 8 + length));
      pos += 12 + length;
    }

    var compressedData = concatBuffers(IDATs);

    var inflater = new Zlib.Inflate(compressedData);
    var uncompressedData = inflater.decompress();

    
    var imageData = img.data = new Uint8Array(img.width * img.height * 4);
    
    for (var i = 0; i < img.height; i++) {
      imageData.set(
        uncompressedData.subarray((img.width * 4 + 1) * i + 1, (img.width * 4 + 1) * (i + 1)), 
        i * 4 * img.width
      );
    }

    return img;

  }


  function writeChunk(type, data) {

    var length;
    switch (Object.prototype.toString.call(data)) {
      case "[object Uint8Array]":
        length = data.length;
        break;

      case "[object Array]":
        length = data.length;
        data = new Uint8Array(data);
        break;

      case "[object DataView]":
        length = data.byteLength;
        data = new Uint8Array(data.buffer);
        break;
    }

    var chunk = new Uint8Array(12 + length);
    var dataView = new DataView(chunk.buffer);
    dataView.setUint32(0, length, false);
    dataView.setUint32(4, type, false);
    chunk.set(data, 8);
    dataView.setUint32(length + 8, Zlib.CRC32.calc(chunk, 4, length + 4), false);

    return chunk;

  }

  var facade = { encode : encode, decode : decode, cropImage : cropImage };

  if (typeof define == 'function' && typeof define.amd == 'object' && define.amd) {
    define([], function () {
      return facade;
    })
  }

  return facade;

})();