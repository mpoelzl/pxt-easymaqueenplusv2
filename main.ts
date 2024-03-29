namespace EasyMaqueenPlusV2 {
    let steeringCorrectionForward = 0;
    let steeringCorrectionBackward = 0;
    let distanceCorrectionForward = 0;
    let distanceCorrectionBackward = 0;
    let wheelDiameter = 43;
    let minSpeed = 30;
    let wheelDegreesPerTurnDegree = 2.5;
    let turnSpeed = 50;
    let turnCorrectionLeft = 0;
    let turnCorrectionLeftOffset = 0;
    let turnCorrectionRight = 0;
    let turnCorrectionRightOffset = 0;
    let MPU6050Initialised = false;

    //Turn direction enumeration selection
    export enum TurnDirection {
        //% block="left"
        Left,
        //% block="right"
        Right
    };

    //Wheel direction enumeration selection
    export enum WheelDirection {
        //% block="forward"
        Forward,
        //% block="back"
        Back
    };

    //% group="Drive control"
    //% block="drive %direction speed %speed"
    //% speed.min=30 speed.max=255
    //% weight=29
    export function drive(direction: WheelDirection, speed: number): void {
        if (speed < minSpeed) { speed = minSpeed; }
        let motorDirection = maqueenPlusV2.MyEnumDir.Forward;
        if (direction == WheelDirection.Back) { motorDirection = maqueenPlusV2.MyEnumDir.Backward; }

        maqueenPlusV2.controlMotor(maqueenPlusV2.MyEnumMotor.LeftMotor, motorDirection, speed * getSteeringCorrectionPercent(speed, direction));
        maqueenPlusV2.controlMotor(maqueenPlusV2.MyEnumMotor.RightMotor, motorDirection, speed);
    }

    //% group="Drive control"
    //% block="drive %direction speed %speed for %seconds seconds"
    //% speed.min=30 speed.max=255
    //% weight=28
    export function driveTime(direction: WheelDirection, speed: number, seconds: number): void {
        if (speed < minSpeed) { speed = minSpeed; }
        let motorDirection = maqueenPlusV2.MyEnumDir.Forward;
        if (direction == WheelDirection.Back) { motorDirection = maqueenPlusV2.MyEnumDir.Backward; }

        maqueenPlusV2.controlMotor(maqueenPlusV2.MyEnumMotor.LeftMotor, motorDirection, speed * getSteeringCorrectionPercent(speed, direction));
        maqueenPlusV2.controlMotor(maqueenPlusV2.MyEnumMotor.RightMotor, motorDirection, speed);
        basic.pause(seconds * 1000);
        maqueenPlusV2.controlMotorStop(maqueenPlusV2.MyEnumMotor.AllMotor);
    }

    //% group="Drive control"
    //% block="drive %direction speed %speed for distance %distance"
    //% speed.min=30 speed.max=255
    //% weight=27
    export function driveDistance(direction: WheelDirection, speed: number, distance: number): void {
        if (speed < minSpeed) { speed = minSpeed; }
        let motorDirection = maqueenPlusV2.MyEnumDir.Forward;
        let microsecondsToRun = getTimeMsForDistanceAndSpeed(speed, distance * getDistanceCorrectionPercent(direction));
        if (direction == WheelDirection.Back) { motorDirection = maqueenPlusV2.MyEnumDir.Backward; }
        
        maqueenPlusV2.controlMotor(maqueenPlusV2.MyEnumMotor.LeftMotor, motorDirection, speed * getSteeringCorrectionPercent(speed, direction));
        maqueenPlusV2.controlMotor(maqueenPlusV2.MyEnumMotor.RightMotor, motorDirection, speed);
        basic.pause(microsecondsToRun);
        maqueenPlusV2.controlMotorStop(maqueenPlusV2.MyEnumMotor.AllMotor);
    }






    //% group="Drive control"
    //% block="drive PID %direction speed %speed for distance %distance"
    //% speed.min=30 speed.max=255
    //% weight=27
    export function driveDistancePID(direction: WheelDirection, speed: number, distance: number): void {
        if (speed < minSpeed) { speed = minSpeed; }
        let motorDirection = maqueenPlusV2.MyEnumDir.Forward;
        let microsecondsToRun = getTimeMsForDistanceAndSpeed(speed, distance * getDistanceCorrectionPercent(direction));
        if (direction == WheelDirection.Back) { motorDirection = maqueenPlusV2.MyEnumDir.Backward; }

        // Setup IMU
        if (!MPU6050Initialised)
        {
            if (MINTsparkMpu6050.InitMPU6050(0))
            {
                MPU6050Initialised = true;
            }
            else
            {
                return;
            }
        }
        
        
        MINTsparkMpu6050.Calibrate(1);
        
        // PID Control
        let startTime = input.runningTime();
        let Kp = 10;
        let Ki = 0.1;
        let Kd = 0.5;
        let targetHeading = MINTsparkMpu6050.UpdateMPU6050().orientation.yaw;
        let lastError = 0;
        let errorSum = 0;
        let speedL = speed;
        let speedR = speed;

        while ((startTime + microsecondsToRun) > input.runningTime())
        {
            let heading = MINTsparkMpu6050.UpdateMPU6050().orientation.yaw;
            let error = targetHeading - heading;
            if (error > 180) { error -= 360 };
            if (error < -180) { error += 360 };

            let errorChange = error - lastError;
            let deleteError = error;
            let correction = Kp * error + Ki * errorSum + Kd * errorChange;
            
            lastError = error;

            if (error <= 10 && error >= -10)
            {
                errorSum += error;
            }
            else if (error > 10)
            {
                errorSum += 10;
            }
            else{
                errorSum -= 10;
            }
            
            speedL = speed + correction;
            speedR = speed - correction;
            if (speedL < 0) {speedL = 0 };
            if (speedR < 0) { speedR = 0 };
            if (speedL > 255) { speedL = 255 };
            if (speedR > 255) { speedR = 255 };

            /*datalogger.log(
                datalogger.createCV("heading", heading),
                datalogger.createCV("error", error),
                datalogger.createCV("errorSum", errorSum),
                datalogger.createCV("errorChange", errorChange),
                datalogger.createCV("correct", correction),
                datalogger.createCV("sl", speedL),
                datalogger.createCV("sr", speedR),
                datalogger.createCV("sr", speedR)
            )
            */

            // Change motor speed
            maqueenPlusV2.controlMotor(maqueenPlusV2.MyEnumMotor.LeftMotor, motorDirection, speedL);
            maqueenPlusV2.controlMotor(maqueenPlusV2.MyEnumMotor.RightMotor, motorDirection, speedR);
        }
        
        maqueenPlusV2.controlMotorStop(maqueenPlusV2.MyEnumMotor.AllMotor);
    }










    //% group="Drive control"
    //% block="stop"
    //% weight=26
    export function controlMotorStop(): void {
        maqueenPlusV2.controlMotorStop(maqueenPlusV2.MyEnumMotor.AllMotor);
    }

    //% group="Turn Controls"
    //% block="set turn speed %newSpeed"
    //% newSpeed.min=30 newSpeed.max=255
    //% weight=14
    export function setTurnSpeed(newSpeed: number): void {
        if (newSpeed < minSpeed) { newSpeed = minSpeed; }
        turnSpeed = newSpeed;
    }

    //% group="Turn Controls"
    //% block="turn %turnDirection for %time ms"
    //% weight=29
    export function turnForTime(turnDirection: TurnDirection, time: number): void {
        let leftMotorDirection = maqueenPlusV2.MyEnumDir.Forward;
        let rightMotorDirection = maqueenPlusV2.MyEnumDir.Backward;
        let turnCorrection = (100 + turnCorrectionRight) / 100;

        if (turnDirection == TurnDirection.Left) {
            leftMotorDirection = maqueenPlusV2.MyEnumDir.Backward;
            rightMotorDirection = maqueenPlusV2.MyEnumDir.Forward;
            turnCorrection = (100 + turnCorrectionLeft) / 100;
        }

        maqueenPlusV2.controlMotor(maqueenPlusV2.MyEnumMotor.LeftMotor, leftMotorDirection, turnSpeed);
        maqueenPlusV2.controlMotor(maqueenPlusV2.MyEnumMotor.RightMotor, rightMotorDirection, turnSpeed);
        basic.pause(time);
        maqueenPlusV2.controlMotorStop(maqueenPlusV2.MyEnumMotor.AllMotor);
    }

    //% group="Turn Controls"
    //% block="turn %turnDirection for %degrees degrees"
    //% weight=29
    export function turn(turnDirection: TurnDirection, degrees: number): void {
        let leftMotorDirection = maqueenPlusV2.MyEnumDir.Forward;
        let rightMotorDirection = maqueenPlusV2.MyEnumDir.Backward;
        let turnCorrection = (100 + turnCorrectionRight) / 100;
        let turnCorrectionOffset = turnCorrectionRightOffset;

        if (turnDirection == TurnDirection.Left)
        {
            leftMotorDirection = maqueenPlusV2.MyEnumDir.Backward;
            rightMotorDirection = maqueenPlusV2.MyEnumDir.Forward;
            turnCorrection = (100 + turnCorrectionLeft) / 100;
            turnCorrectionOffset = turnCorrectionLeftOffset;
        }

        let speedAdjustment = 2E-07 * turnSpeed * turnSpeed * turnSpeed - 9E-05 * turnSpeed * turnSpeed + 0.0174 * turnSpeed - 0.035;
        let pauseTime = ((degrees / (0.2 / turnCorrection)) + 10 + turnCorrectionOffset) / speedAdjustment;
        
        maqueenPlusV2.controlMotor(maqueenPlusV2.MyEnumMotor.LeftMotor, leftMotorDirection, turnSpeed);
        maqueenPlusV2.controlMotor(maqueenPlusV2.MyEnumMotor.RightMotor, rightMotorDirection, turnSpeed);
        basic.pause(pauseTime);
        maqueenPlusV2.controlMotorStop(maqueenPlusV2.MyEnumMotor.AllMotor);
    }

    //% group="Adjustments"
    //% block="read steering correction %direction \\%"
    //% weight=20
    export function readSteeringCorrection(direction: WheelDirection): number {
        if (direction == WheelDirection.Forward)
        {
            return steeringCorrectionForward;
        }

        return steeringCorrectionBackward;
    }

    //% group="Adjustments"
    //% block="read distance correction %direction \\%"
    //% weight=18
    export function readDistanceCorrection(direction: WheelDirection): number {
        if (direction == WheelDirection.Forward) {
            return distanceCorrectionForward;
        }

        return distanceCorrectionBackward;
    }

    //% group="Adjustments"
    //% block="set steering correction for direction %direction %correction \\% (positive number turns more to the right)"
    //% weight=16
    export function setSteeringCorrection(direction: WheelDirection, correction: number): void {
        if (direction == WheelDirection.Forward) {
            steeringCorrectionForward = correction;
        }
        else{
            steeringCorrectionBackward = correction;
        }
    }

    //% group="Adjustments"
    //% block="set distance correction %direction %correction \\%"
    //% weight=14
    export function setDistanceCorrection(direction: WheelDirection, correction: number): void {
        if (direction == WheelDirection.Forward) {
            distanceCorrectionForward = correction;
        }
        else {
            distanceCorrectionBackward = correction;
        }
    }

    //% group="Adjustments"
    //% block="set turn correction %direction %correction \\%"
    //% weight=12
    export function setTurnCorrection(direction: TurnDirection, correction: number): void {
        if (direction == TurnDirection.Right) {
            turnCorrectionRight = correction;
        }
        else {
            turnCorrectionLeft = correction;
        }
    }

    //% group="Adjustments"
    //% block="set turn correction offset %direction %correction ms"
    //% weight=12
    export function setTurnCorrectionOffset(direction: TurnDirection, correction: number): void {
        if (direction == TurnDirection.Right) {
            turnCorrectionRightOffset = correction;
        }
        else {
            turnCorrectionLeftOffset = correction;
        }
    }

    //% group="Adjustments"
    //% block="set wheel diameter %diameter"
    //% weight=98
    export function setWheelDiameterCorrection(diameter: number): void {
        wheelDiameter = diameter;
    }

    function getTimeMsForDistanceAndSpeed(speed: number, distance:number) : number
    {
        let distanceMmOneSecond = 5E-05 * speed * speed * speed - 0.0229 * speed * speed + 3.5795 * speed + 3.8194;
        //let degreesOneSecond = 6E-05 * speed * speed * speed - 0.0332 * speed * speed + 6.28*speed - 12.616;
        //let distanceOneDegree = wheelDiameter * Math.PI / 360;
        //return (distance / (degreesOneSecond * distanceOneDegree)) * 1000;
        return (distance / distanceMmOneSecond) * 1000;
    }

    function getTimeMsForDegreesAndSpeed(speed: number, degrees: number): number {
        let degreesOneSecond = 6E-05 * speed * speed * speed - 0.0332 * speed * speed + 6.28 * speed - 12.616;
        return (1 / degreesOneSecond) * degrees * 1000;
    }

    function getDistanceCorrectionPercent(direction: WheelDirection) : number {
        if (direction == WheelDirection.Forward) {
            return (100 + distanceCorrectionForward) / 100;
        }
        else {
            return (100 + distanceCorrectionBackward) / 100;
        }
    }

    function getSteeringCorrectionPercent(speed: number, direction: WheelDirection): number {
        let speedAdjustment = 2E-07 * speed * speed * speed - 9E-05 * speed * speed + 0.0174 * speed - 0.035;

        if (direction == WheelDirection.Forward)
        {
            return (100 + (steeringCorrectionForward * speedAdjustment)) / 100;
        }
        else{
            return (100 + (steeringCorrectionBackward * speedAdjustment)) / 100;
        }
    }
}