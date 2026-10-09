import { Composition } from "remotion";
import { MyComposition } from "./Composition";
import { Cumple, DURACION } from "./cumple/Cumple";
import { SuperCumple, DURACION_SUPER } from "./cumple/SuperCumple";
import { SuperCumple3, DURACION_SUPER3 } from "./cumple/SuperCumple3";

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
      <Composition
        id="SuperCumpleLuisFernando"
        component={SuperCumple}
        durationInFrames={DURACION_SUPER}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="SuperCumple3D"
        component={SuperCumple3}
        durationInFrames={DURACION_SUPER3}
        fps={30}
        width={1080}
        height={1920}
      />
    </>
  );
};
