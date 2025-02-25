import { RootDTO } from "../dto/root.dto";
import { Result } from "../../../../shared/core/Result";

export interface IRootService {
    returnMessage(message: string): Promise<Result<{ root: RootDTO; message: string; }, Error>>;
}
