import { notificationService } from "./firebase/notification";
import Scheduler from "./jobs/schedule";



Scheduler.getInstance().init();
notificationService.initialize();
