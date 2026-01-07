import {createReactiveTui, useRef} from "./reactive-tui.js";
import {RemoteDevice, awaitEvent} from "canopener";
import {ResolvablePromise} from "./js-util.js";

function useUiDevice() {
	return UiDevice.instance;
}

export function useEncoderDelta() {
	let encoder=useEncoder();
	let currentRef=useRef();
	if (currentRef.current===undefined)
		currentRef.current=encoder;

	let delta=encoder-currentRef.current;
	if (delta>32)
		delta-=64;

	if (delta<-32)
		delta+=64;

	currentRef.current=encoder;

	return delta;
}

export function useClampedEncoder(min, max) {
	let encoder=useEncoder();
	let currentRef=useRef();
	let valueRef=useRef(min);
	if (currentRef.current===undefined)
		currentRef.current=encoder;

	let delta=encoder-currentRef.current;
	if (delta>32)
		delta-=64;

	if (delta<-32)
		delta+=64;
	//console.log("delta: "+delta);

	valueRef.current+=delta;
	if (valueRef.current<min)
		valueRef.current=min;

	if (valueRef.current>=max)
		valueRef.current=max-1;

	currentRef.current=encoder;
	return valueRef.current;
}

export function useEncoder() {
	let uiDevice=useUiDevice();

	return uiDevice.encoderEntry.get();
}

export function useEncoderButton(fn) {
	let uiDevice=useUiDevice();
	let ref=useRef();
	if (ref.current!==undefined &&
			ref.current!=uiDevice.buttonCountEntry.get()) {
		fn();
	}

	ref.current=uiDevice.buttonCountEntry.get();
}

export default class UiDevice {
	constructor(element) {
		this.reactiveTui=createReactiveTui(element);
		this.reactiveTui.on("refresh",()=>{
			if (this.refreshPromise)
				this.refreshPromise.resolve();
		});

		/*this.remoteDevice=new RemoteDevice({nodeId});

		for (let row=0; row<4; row++)
			for (let chunk=0; chunk<5; chunk++)
				this.chunkEntry(row,chunk).setType("uint32");

		this.refreshPromise=new ResolvablePromise();
		this.encoderEntry=this.remoteDevice.entry(0x5f00,0).setType("uint8");//subscribe({interval: 100});
		this.buttonCountEntry=this.remoteDevice.entry(0x5f02,0).setType("uint8");//.subscribe({interval: 100});

		this.encoderEntry.on("change",()=>this.refreshPromise.resolve());
		this.buttonCountEntry.on("change",()=>this.refreshPromise.resolve());*/

		//this.encoderEntry.on("change",()=>console.log("encoder change..."));
	}

	async setRemoteDevice(remoteDevice) {
		if (this.remoteDevice)
			throw new Error("Can only set remote device once! (WIP)");

		this.remoteDevice=remoteDevice;
		if (this.remoteDevice.getState()!="operational")
			throw new Error("not operational!!!");

		for (let row=0; row<4; row++)
			for (let chunk=0; chunk<5; chunk++)
				this.chunkEntry(row,chunk).setType("uint32");

		this.refreshPromise=new ResolvablePromise();
		this.encoderEntry=this.remoteDevice.entry(0x5f00,0).setType("uint8");//subscribe({interval: 100});
		this.buttonCountEntry=this.remoteDevice.entry(0x5f02,0).setType("uint8");//.subscribe({interval: 100});

		this.encoderEntry.on("change",()=>this.refreshPromise.resolve());
		this.buttonCountEntry.on("change",()=>this.refreshPromise.resolve());

		this.encoderEntry.subscribe({pdoChannel:1});
		this.buttonCountEntry.subscribe({pdoChannel:2});

		await this.remoteDevice.flush();
		await this.refresh();

		//await new Promise(r=>setTimeout(r,100));

		//this.remoteDevice.on("stateChange",this.handleStateChange);

		this.run();
	}

	/*handleStateChange=()=>{
		console.log("ui device state="+this.remoteDevice.getState());
	}*/

	chunkEntry(row, chunk) {
		return this.remoteDevice.entry(0x7000+row,chunk+1);
	}

	/*async init() {
		//let promises=[];

		for (let row=0; row<4; row++) {
			for (let chunk=0; chunk<5; chunk++) {
				//console.log("row: "+row+" chunk: "+chunk);
				//this.chunkEntry(row,chunk).set(0x41424344);

				//await this.chunkEntry(row,chunk).set(0x20202020);
			}
		}

		this.encoderEntry.subscribe({pdoChannel:1});
		this.buttonCountEntry.subscribe({pdoChannel:2});

		await this.remoteDevice.flush();
	}*/

	async setLines(lines) {
		//console.log(lines);

		for (let lineIndex=0; lineIndex<4; lineIndex++) {
			let line=lines[lineIndex];
			if (!line)
				line="";

			line=line.padEnd(20);
			for (let chunkIndex=0; chunkIndex<5; chunkIndex++) {
				let data=
					(line.charCodeAt(chunkIndex*4+0)<<24)+
					(line.charCodeAt(chunkIndex*4+1)<<16)+
					(line.charCodeAt(chunkIndex*4+2)<<8)+
					(line.charCodeAt(chunkIndex*4+3)<<0);

				if (data!=this.chunkEntry(lineIndex,chunkIndex).get()) {
					//console.log("update "+lineIndex+" "+chunkIndex+" "+data);
					this.chunkEntry(lineIndex,chunkIndex).set(data);
				}
			}
		}

		await this.remoteDevice.flush();
	}

	async refresh() {
		//console.log("refresh, enc="+this.encoderEntry.get()+" btn="+this.buttonCountEntry.get());

		this.refreshPromise=new ResolvablePromise();
		UiDevice.instance=this;

		if (global.gc) {
			let collected=global.gc();
			//console.log("collected before: "+collected);
		}

		let unflatContent=this.reactiveTui.render();
		let content=unflatContent.flat(Infinity);
		//console.log(content);

		if (global.gc) {
			let collected=global.gc();
			//console.log("collected mid: "+collected);
		}

		await this.setLines(content);

		if (global.gc) {
			let collected=global.gc();
			//console.log("collected after: "+collected);
		}
	}

	async run() {
		while (1) {
			await this.refresh();

			//console.log("awaiting...");
			await this.refreshPromise;
		}
	}
}

export function createUiDevice(element) {
	let uiDevice=new UiDevice(element);
	return uiDevice;
}