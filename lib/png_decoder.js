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
		pointer += a.length;
	});

	return result;
}

function pngdecode(data) {

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

	img.data = Zlib.Inflate(compressedData);

	return img;
}