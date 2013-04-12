/**
 * Created a PNG image from the specified BitmapData
 *
 * @param image The BitmapData that will be converted into the PNG format.
 * @return a ByteArray representing the PNG encoded image data.
 * @langversion ActionScript 3.0
 * @playerversion Flash 9.0
 * @tiptext
 */

function pngencode(img) {
  // Create output byte array
  var png = [];
  // Write PNG signature
  png.push(new Uint32Array([ 0x474e5089, 0x0A1A0A0D ]));
  
  // Build IHDR chunk
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
  return png;
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