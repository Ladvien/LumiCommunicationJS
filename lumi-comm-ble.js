var LumiBluetooth = (function () {

	// Privates
	var pairedDevices = {};
	var onReceivedDataCallbacks = [];
	var writeCharacteristic;
	var writeBuffer;
	var writing = false;

	// Adds a function called when a BLE characteristic changes value.
	// Mutiple callbacks may be added.
	this.addReceivedDataCallback = function (callback) {
		if (writeCharacteristic) {
			writeCharacteristic.addEventListener('characteristicvaluechanged', callback);
			onReceivedDataCallbacks.push({
				key: callback.name,
				value: callback
			})
		}
	}

	// Clears the RecievedDataCallback dictionary.
	this.removeAllReceivedDataCallbacks = function () {
		onReceivedDataCallbacks = [];
	}

	// Searches for Devices based upon Service IDs.  Then prompts
	// a user to select a target device.  Lastly, it conencts to
	// target d evice.
	this.searchAndConnect = function (primaryServicesUUID, addSystemText = "") {
		return new Promise(function (resolve, reject) {
			let optionalServices = document.getElementById('optionalServices').value
				.split(/, ?/).map(s => s.startsWith('0x') ? parseInt(s) : s)
				.filter(s => s && BluetoothUUID.getService);

			if (addSystemText) {
				addSystemText('Requesting any Bluetooth Device...');
			}
			navigator.bluetooth.requestDevice({
					acceptAllDevices: true,
					optionalServices: optionalServices

				}) // After getting a device
				.then(device => {
					pairedDevices[device.name] = device;
					if (addSystemText) {
						addSystemText('Connecting to GATT Server...');
					}
					return device.gatt.connect();
				}) // After connecting
				.then(server => {
					if (addSystemText) {
						addSystemText('Getting Services...');
					}
					return server.getPrimaryServices();
				}) // After getting services
				.then(services => {
					if (addSystemText) {
						addSystemText("Found services: ");
					}
					services.forEach(service => {
						let queue = Promise.resolve();
						queue = queue.then(_ => service.getCharacteristics().then(characteristics => {
							if (addSystemText) {
								addSystemText('Service: ' + service.uuid);
							}
							characteristics.forEach(characteristic => {
								if (addSystemText) {
									addSystemText('>> Characteristic: ' + characteristic.uuid + ' ' +
										getSupportedProperties(characteristic));
								}
								writeCharacteristic = characteristic;
								if (addSystemText) {
									addSystemText("Write characteristic set");
								}
								writeCharacteristic.startNotifications();
								resolve();
							}); // End enumerating characteristics
						})); // End queue
					}) // End enumerating services
				}). // End Service exploration                   
			catch(error => {
				if (addSystemText) {
					addSystemText(error);
				}
			})
		}); // End Search and Connect Promise
	} // End Search and Connect Function

	this.writeString = async function (data, addSystemText = null) {
		write(data, true, addSystemText);
	}

	this.writeData = async function (data, addSystemText = null) {
		write(data, false, addSystemText);
	}

	var write = function (data, string = true, addSystemText = null) {
		p = new Promise(function (resolve, reject) {
			if (pairedDevices) {
				if (writeCharacteristic != null) {
					// Don't double encode.
					if (string) {
						let encoder = new TextEncoder('utf-8');
						var writeData = encoder.encode(data);
						writeBuffer = appendUint8Buffer(writeBuffer, writeData);
						if(!writing){
							writeLoop(writeData);
						}
					} else {
						dataInUint8 = Uint8Array.from(data);
						writeBuffer = appendUint8Buffer(writeBuffer, dataInUint8);
						if(!writing){
							writeLoop(writeData);
						}
					}
					resolve();
				} else {
					reject("No write characteristic")
				}
			} else {
				reject("No devices paired.")
			}
		}).catch(error => {
			if (addSystemText) {
				addSystemText("No device paired");
			}
		});
		return p;
	}

	this.disconnectDevice = function () {

	}

	var writeLoop = async function(data){
		writing = true;
		console.log(writeBuffer);
		for(var i = 0; i < writeBuffer.length; i){
			var length = 0;
			if(writeBuffer.length < (i + 20)){ length = writeBuffer.length} else { length = i + 20; }
			var tmpWriteBfr = writeBuffer.slice(i, length);
			console.log(tmpWriteBfr);
			writeCharacteristic.writeValue(tmpWriteBfr);
			await sleep(42);
			i+=20;
		}
		writeBuffer = null;
		writing = false;
	}

	/* Utils */
	function getSupportedProperties(characteristic) {
		let supportedProperties = [];
		for (const p in characteristic.properties) {
			if (characteristic.properties[p] === true) {
				supportedProperties.push(p.toUpperCase());
			}
		}
		return '[' + supportedProperties.join(', ') + ']';
	}

	var appendUint8Buffer = function (bufferOne, bufferTwo) {
		if(!bufferOne){return bufferTwo;}
		var tmp = new Uint8Array(bufferOne.byteLength + bufferTwo.byteLength);
		tmp.set(new Uint8Array(bufferOne), 0);
		tmp.set(new Uint8Array(bufferTwo), bufferOne.byteLength)
		return tmp.buffer;
	}

	return {
		addReceivedDataCallback: addReceivedDataCallback,
		searchAndConnect: searchAndConnect,
		writeString: writeString,
		writeData: writeData,
		disconnectDevice: disconnectDevice
	}
})(); // End Proto
