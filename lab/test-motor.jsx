import {MasterDevice} from "canopener";
import * as canopener from "canopener";

import {createUiDevice, useEncoder, useEncoderButton, useClampedEncoder,
		useRef, Menu, useBack, useEncoderDelta} from "../api/exports.js";

function ObjectEditor({name, title, dev, index, subIndex, min, max, step}) {
	let back=useBack();
	useEncoderButton(()=>back());
	let delta=useEncoderDelta();
	let entry=dev.entry(index,subIndex);

	if (!step)
		step=1;

	if (delta) {
		let v=entry.get()+delta*step;
		if (v<min)
			v=min;

		if (v>max)
			v=max;

		entry.set(v);
	}

	return (["",name.padStart(9)+": "+entry.get(),"","      [ Back ]      "]);
}

function App({motor}) {
	let targetEntry=motor.entry(0x607A,0x00);

	return (
		<Menu title="Flatpak">
			<Menu title="Start Que Job">
				<Menu title="Job #123"/>
				<Menu title="Job #124"/>
				<Menu title="Job #125"/>
				<Menu title="Job #126"/>
				<Menu title="Job #127"/>
				<Menu title="Job #128"/>
			</Menu>
			<Menu title="Status">
			</Menu>
			<Menu title="Test">
				<ObjectEditor dev={motor} index={0x607A} subIndex={0x00} 
						name={"Motor"}
						title={"Motor: "+targetEntry.get()} 
						min={0} max={10000} step={100}/>
				<Menu title="Jog Rail Axis"/>
				<Menu title="Jog Vert. Axis"/>
			</Menu>
			<Menu title="Settings">
				<Menu title="Wifi Settings"/>
				<Menu title="Device Homing"/>
			</Menu>
		</Menu>
	);
}

function App2({motor}) {
	let targetEntry=motor.entry(0x607A,0x00);

	return (
		<Menu title="Flatpak">
			<Menu title="Start Queued Job">
				<Menu title="Job #123"/>
				<Menu title="Job #124"/>
				<Menu title="Job #125"/>
				<Menu title="Job #126"/>
				<Menu title="Job #127"/>
				<Menu title="Job #128"/>
			</Menu>
			<Menu title="Settings1"/>
			<Menu title="Settings2"/>
			<Menu title="Settings3"/>
			<ObjectEditor dev={motor} index={0x607A} subIndex={0x00} 
					name={"Motor"}
					title={"Motor: "+targetEntry.get()} 
					min={0} max={10000} step={100}/>
		</Menu>
	);
}

async function run() {
	let bus;
	if (global.canBus) {
		bus=global.canBus;
	}

	else {
		let co=canopener;
		//bus=await openSlcanBus({path: "/dev/ttyESP-50:78:7D:8F:D7:E4", baudRate: 115200}); // motor
		bus=await co.openSlcanBus({path: "/dev/ttyESP-50:78:7D:8F:D7:D0", baudRate: 115200}); // ui
		//bus=await openSlcanBus({path: "/dev/ttyESP-50:78:7D:91:F1:F0", baudRate: 115200}); // brain
	}

	let masterDevice=new MasterDevice({bus});
	let uiDevice=masterDevice.createRemoteDevice(6);
	let motor=masterDevice.createRemoteDevice(5);

	await motor.awaitState("operational");

	let targetPosition=motor.entry(0x607A,0x00).setType("int32");
	let actualPosition=motor.entry(0x6064,0x00).setType("int32");

	let maxVel=motor.entry(0x6081,0x00).setType("int32");
	let maxAccel=motor.entry(0x6083,0x00).setType("int32");
	let maxDecel=motor.entry(0x6084,0x00).setType("int32");
	let control=motor.entry(0x6040,0x00).setType("uint16");

	//control.set(0x0);
	control.set(0x0f);
	maxAccel.set(10000);
	maxDecel.set(10000);
	maxVel.set(16000);
	targetPosition.set(0);
	await motor.flush();
	console.log("Motor initialized..");

	await uiDevice.awaitState("operational");

	//let ui=createUiDevice(<App motor={motor}/>);
	let ui=createUiDevice(<App2 motor={motor}/>);
	await ui.setRemoteDevice(uiDevice);

	console.log("Motor UI initialized..");
}

run();
