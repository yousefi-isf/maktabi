import ZKLib from 'node-zklib';

async function run(): Promise<void> {
    const zkInstance = new ZKLib('192.168.2.201', 4370, 5200, 5000);

    try {
        await zkInstance.createSocket();

        const users = await zkInstance.getUsers();
        console.log('=== Users ===');
        console.log(users.data);

        const logs = await zkInstance.getAttendances();
        console.log('=== Attendance Records ===');
        console.log(logs.data);

        await zkInstance.disconnect();
    } catch (err) {
        console.log('Error:', err);
    }
}

run();