const $ = (id) => document.getElementById(id);

let currentAudio = null;
function playAudio(newAudio) {
    // --------------
    // HELPERS
    // --------------
    const TIME_STEP = 500;
    const VOL_STEP = .05;

    function fadeOut(audio) {
        const intervalId = setInterval(() => {
            audio.volume = Math.max(0, audio.volume - VOL_STEP);
            if (audio.volume <= 0) {
                clearInterval(intervalId);
            }
        }, TIME_STEP)
    }

    function fadeIn(audio) {
        audio.volume = 0;
        audio.play();
        const intervalId = setInterval(() => {
            audio.volume = Math.min(1, audio.volume + VOL_STEP);
            if (audio.volume >= 1) {
                clearInterval(intervalId);
            }
        }, TIME_STEP)
    }
    // --------------

    // --------------
    // MAIN LOGIC 
    // --------------

    const prevAudio = currentAudio;

    if (prevAudio === newAudio)
        return;

    if (prevAudio) {
        fadeOut(prevAudio);
    }

    fadeIn(newAudio);

    currentAudio = newAudio;
    // --------------
}

document.addEventListener("DOMContentLoaded", async function() {
    const $ = (id) => document.getElementById(id);

    const classNames = ["rogue", "knight", "warrior"];
    const audios = {};

    for (const className of classNames) {
        const audio = document.createElement("audio");
        audio.src = `https://bladeandbrawn.com/${className}.ogg`;
        audio.loop = true;
        audio.volume = 0;
        audio.id = `audio-${className}`;
        $("audioContainer").appendChild(audio);
        audios[className] = audio;
    }

    await Promise.all(classNames.map(async (className) => {
        const audio = audios[className];
        try {
            await audio.play();
            audio.pause();
            audio.currentTime = 0;
        } catch (e) {
            console.warn(`Autoplay failed for ${className}:`, e);
        }
    }));

    // Start all in perfect sync
    classNames.forEach(className => {
        const audio = audios[className];
        audio.currentTime = 0;
        audio.play();
    });

    // Hook up buttons
    classNames.forEach(className => {
        $(`btn-${className}`).onclick = () => {
            $("currentClass").textContent = className;
            playAudio(audios[className]);
        };
    });

    // Set initial state
    $("currentClass").textContent = "rogue";
    playAudio(audios["rogue"]);
});
