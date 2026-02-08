import {IContainer, IContainerModule, Registration as R} from "ts-ioc-container";
import {NodeFileSystemService} from "../services/NodeFileSystemService";
import {GitService} from "../services/GitService";
import {HandlebarsRenderService} from "../services/HandlebarsRenderService";

import {Dispatcher} from "../IDispatcher";

export class CommonDeps implements IContainerModule {
    applyTo(container: IContainer): void {
        container.addRegistration(R.fromClass(NodeFileSystemService));
        container.addRegistration(R.fromClass(GitService));
        container.addRegistration(R.fromClass(HandlebarsRenderService));
        container.addRegistration(R.fromClass(Dispatcher));
    }
}
