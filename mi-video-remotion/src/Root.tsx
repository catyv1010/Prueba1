import { Composition } from "remotion";
import { MyComposition } from "./Composition";
import { Cumple, DURACION } from "./cumple/Cumple";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <MyComposition />
      <Composition
        id="CumpleLuisFernando"
        component={Cumple}
        durationInFrames={DURACION}
        fps={30}
        width={1080}
        height={1920}
      />
    </>
  );
};
