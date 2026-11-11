/*
 * Media manifest. Plain script, no fetch(), so the page works from file://.
 * Entry shape (every slot): { title, prompt, thumb, posters, caption, tiles: [{ label, src, ours }] }.
 * posters: true uses <clip>.jpg as each tile's poster. An empty array hides the slot.
 * Paths are relative to index.html.
 */
(function () {
  'use strict';

  var MODELS = [
    { key: 'ours_mf', label: 'Ours (MeanFlow)', ours: true },
    { key: 'ours', label: 'Ours (π-Flow)', ours: true },
    { key: 'self_forcing', label: 'Self Forcing' },
    { key: 'causal_forcing', label: 'Causal Forcing' },
    { key: 'causal_rcm', label: 'Causal-rCM' }
  ];

  // One row per model: Ours (MeanFlow), Ours (π-Flow), Self Forcing, Causal Forcing, Causal-rCM.
  function row(prefix) {
    return MODELS.map(function (m) { return { label: m.label, src: prefix + m.key + '.mp4', ours: !!m.ours }; });
  }

  // Diversity: the same five tiles as a quality row; each clip is seeds 0 to 3 of one model in a 2 x 2 grid.
  function seedGrid(prefix) {
    return MODELS.map(function (m) { return { label: m.label, src: prefix + m.key + '.mp4', ours: !!m.ours }; });
  }
  function driftN(prefix) {
    return [{ label: 'w/o anti-drifting guidance', src: prefix + 'noad.mp4' },
            { label: 'w/ anti-drifting guidance', src: prefix + 'ours.mp4', ours: true }];
  }
  var SEEDS = 'Each clip shows seeds 0 to 3 in a 2 × 2 grid. 5 s. Our students are distilled from the Causal Forcing teacher.';

  var LONG = '30 s rollout with Deep Forcing. Our students are distilled from the Causal-rCM teacher.';
  var SHORT = 'The first 5 s of a 30 s rollout with Deep Forcing. Our students are distilled from the Causal Forcing teacher.';

  window.SITE_MEDIA = {
    hq: [
      { title: 'Rabbit reading', thumb: 'media/quality/hq_rabbit_thumb.jpg', posters: true,
        prompt: 'A charming illustration in a watercolor style of a young white rabbit wearing glasses and reading a newspaper. …',
        caption: SHORT, tiles: row('media/quality/hq_rabbit_') },
      { title: 'Blinking eye', thumb: 'media/quality/hq_eye_thumb.jpg', posters: true,
        prompt: 'A cinematic film shot in 70mm, capturing an extreme close-up of a 24-year-old woman\'s eye as it blinks. …',
        caption: SHORT, tiles: row('media/quality/hq_eye_') },
      { title: 'Cyberpunk robot', thumb: 'media/quality/hq_robot_thumb.jpg', posters: true,
        prompt: 'A cyberpunk-style illustration depicting a lone robot navigating a neon-lit cityscape. …',
        caption: SHORT, tiles: row('media/quality/hq_robot_') },
      { title: 'Runner', thumb: 'media/quality/hq_runner_thumb.jpg', posters: true,
        prompt: 'A cinematic film shot in 35mm capturing a dynamic step-printing scene of a person running. …',
        caption: SHORT, tiles: row('media/quality/hq_runner_') },
      { title: 'Tokyo street', thumb: 'media/quality/hq_tokyo_thumb.jpg', posters: true,
        prompt: 'A stylish woman strolls down a bustling Tokyo street, the warm glow of neon lights and animated city signs casting vibrant reflections. …',
        caption: SHORT, tiles: row('media/quality/hq_tokyo_') },
      { title: 'Woolly mammoths', thumb: 'media/quality/hq_mammoths_thumb.jpg', posters: true,
        prompt: 'A stunning mid-afternoon landscape photograph with a low camera angle, showcasing several giant wooly mammoths treading through a snowy meadow. …',
        caption: SHORT, tiles: row('media/quality/hq_mammoths_') },
      { title: 'Rock man', thumb: 'media/quality/hq_rockman_thumb.jpg', posters: true,
        prompt: 'A full-body shot of a man crafted entirely from rocks, walking through a dense forest. …',
        caption: SHORT, tiles: row('media/quality/hq_rockman_') },
      { title: 'Four seasons', thumb: 'media/quality/hq_seasons_thumb.jpg', posters: true,
        prompt: 'A dynamic photograph capturing a little boy riding his bike through a garden that transitions through the changing seasons—fall leaves crunch underfoot, winter snow blankets the ground, spring flowers bloom, and summer sunshine sparkles through the foliage. …',
        caption: SHORT, tiles: row('media/quality/hq_seasons_') },
      { title: 'Cat in a basket', thumb: 'media/quality/hq_basket_thumb.jpg', posters: true,
        prompt: 'A whimsical illustration in a soft watercolor style of a curious cat peeking out from a cozy, woven basket hidden behind a pile of fluffy cushions. …',
        caption: SHORT, tiles: row('media/quality/hq_basket_') },
      { title: 'Vintage SUV', thumb: 'media/quality/hq_suv_thumb.jpg', posters: true,
        prompt: 'A dynamic shot from behind a white vintage SUV with a black roof rack as it speeds up a steep dirt road surrounded by towering redwood trees on a rugged mountain slope. …',
        caption: SHORT, tiles: row('media/quality/hq_suv_') }
    ],
    quality: [
      { title: 'Gray-haired man', thumb: 'media/quality/long_oldman_thumb.jpg', posters: true,
        prompt: 'A cinematic 35mm film-style extreme close-up of a gray-haired man in his 60s, deeply engrossed in thought about the history of the universe as he sits at a Parisian café. …',
        caption: LONG, tiles: row('media/quality/long_oldman_') },
      { title: 'Fluffy monster', thumb: 'media/quality/long_monster_thumb.jpg', posters: true,
        prompt: 'A close-up 3D animated scene of a short, fluffy monster kneeling beside a melting red candle. …',
        caption: LONG, tiles: row('media/quality/long_monster_') },
      { title: 'Burning building', thumb: 'media/quality/long_fire_thumb.jpg', posters: true,
        prompt: 'A dramatic photo in a gritty, realistic style of a middle-aged man standing in front of a partially collapsed, burning building. …',
        caption: LONG, tiles: row('media/quality/long_fire_') },
      { title: 'Chef', thumb: 'media/quality/long_chef_thumb.jpg', posters: true,
        prompt: 'A dynamic scene captured in the style of a vibrant food photography, showcasing a chef skillfully chopping onions in a bustling kitchen. …',
        caption: LONG, tiles: row('media/quality/long_chef_') },
      { title: 'Western', thumb: 'media/quality/long_western_thumb.jpg', posters: true,
        prompt: 'A cinematic scene from a classic western movie, featuring a rugged man riding a powerful horse through the vast Gobi Desert at sunset. …',
        caption: LONG, tiles: row('media/quality/long_western_') },
      { title: 'Chinese dragon', thumb: 'media/quality/long_dragon_thumb.jpg', posters: true,
        prompt: 'A vibrant and lively Chinese Lunar New Year celebration video featuring a majestic Chinese dragon performing traditional dance moves. …',
        caption: LONG, tiles: row('media/quality/long_dragon_') },
      { title: 'Pirate ships', thumb: 'media/quality/long_pirate_thumb.jpg', posters: true,
        prompt: 'A photorealistic closeup video of two pirate ships battling each other as they sail inside a steaming cup of coffee. …',
        caption: LONG, tiles: row('media/quality/long_pirate_') },
      { title: 'Space man', thumb: 'media/quality/long_spaceman_thumb.jpg', posters: true,
        prompt: 'A movie trailer in a classic cinematic style, featuring the adventurous journey of a 30-year-old space man wearing a vibrant red wool knitted motorcycle helmet. …',
        caption: LONG, tiles: row('media/quality/long_spaceman_') },
      { title: 'Sunken New York', thumb: 'media/quality/long_atlantis_thumb.jpg', posters: true,
        prompt: 'A surreal and dreamlike scene in the style of a cyberpunk film, depicting New York City submerged underwater, resembling the mythical city of Atlantis. …',
        caption: LONG, tiles: row('media/quality/long_atlantis_') },
      { title: 'Corgi vlog', thumb: 'media/quality/long_corgi_thumb.jpg', posters: true,
        prompt: 'A vibrant and lively vlog-style photo of a corgi in tropical Maui, showcasing the dog energetically filming itself on a sandy beach. …',
        caption: LONG, tiles: row('media/quality/long_corgi_') }
    ],
    diversity: [
      { title: 'Gwen Stacy', thumb: 'media/diversity/gwen_thumb.jpg', posters: true,
        prompt: 'A close-up shot of Gwen Stacy sitting in a cozy armchair, reading a book. …',
        caption: SEEDS, tiles: seedGrid('media/diversity/grid_gwen_') },
      { title: 'Astronaut on a horse', thumb: 'media/diversity/horse_thumb.jpg', posters: true,
        prompt: 'In a photorealistic style, an astronaut in a sleek, modern spacesuit is riding a horse floating in the vast expanse of space. …',
        caption: SEEDS, tiles: seedGrid('media/diversity/grid_horse_') },
      { title: 'Cat in a park', thumb: 'media/diversity/cat_thumb.jpg', posters: true,
        prompt: 'A playful cat exploring a sunny park. …',
        caption: SEEDS, tiles: seedGrid('media/diversity/grid_cat_') },
      { title: 'Robot DJ', thumb: 'media/diversity/dj_thumb.jpg', posters: true,
        prompt: 'In a futuristic Tokyo rooftop set during a heavy rainstorm, a robot DJ is spinning records at a cyberpunk nightclub. …',
        caption: SEEDS, tiles: seedGrid('media/diversity/grid_dj_') },
      { title: 'Panda on a swing', thumb: 'media/diversity/panda_thumb.jpg', posters: true,
        prompt: 'A cute and playful panda bear swinging back and forth on a traditional swing set in a lush bamboo forest. …',
        caption: SEEDS, tiles: seedGrid('media/diversity/grid_panda_') },
      { title: 'Black suitcase', thumb: 'media/diversity/suitcase_thumb.jpg', posters: true,
        prompt: 'A close-up of a sleek black leather suitcase with a silver handle and lock. …',
        caption: SEEDS, tiles: seedGrid('media/diversity/grid_suitcase_') },
      { title: 'Brown bear', thumb: 'media/diversity/bear_thumb.jpg', posters: true,
        prompt: 'A wild brown bear prowling through a dense forest, searching intently for prey. …',
        caption: SEEDS, tiles: seedGrid('media/diversity/grid_bear_') },
      { title: 'Country house', thumb: 'media/diversity/house_thumb.jpg', posters: true,
        prompt: 'A serene and tranquil tableau of a cozy house nestled in a peaceful countryside setting. …',
        caption: SEEDS, tiles: seedGrid('media/diversity/grid_house_') },
      { title: 'Clownfish', thumb: 'media/diversity/clownfish_thumb.jpg', posters: true,
        prompt: 'A vibrant underwater scene featuring several clownfish swimming gracefully through a colorful coral reef. …',
        caption: SEEDS, tiles: seedGrid('media/diversity/grid_clownfish_') },
      { title: 'Broccoli', thumb: 'media/diversity/broccoli_thumb.jpg', posters: true,
        prompt: 'A close-up shot of fresh broccoli florets, each individual floret tightly clustered and vibrant green. …',
        caption: SEEDS, tiles: seedGrid('media/diversity/grid_broccoli_') }
    ],
    abl_div: [
      { title: 'Green bicycle', thumb: 'media/diversity/bicycle_thumb.jpg', posters: true,
        prompt: 'A vibrant green bicycle parked neatly on a clean, paved sidewalk under a clear blue sky.',
        tiles: driftN('media/diversity/grid_bicycle_') },
      { title: 'Brown bear', thumb: 'media/diversity/bear_thumb.jpg', posters: true,
        prompt: 'A wild brown bear prowling through a dense forest, searching intently for prey.',
        tiles: driftN('media/diversity/grid_bear_') },
      { title: 'Car and motorcycle', thumb: 'media/diversity/adiv_car_thumb.jpg', posters: true,
        prompt: 'A high-definition, dynamic scene featuring a sleek red sports car parked next to a shiny black motorcycle. …',
        tiles: driftN('media/diversity/adiv_car_') },
      { title: 'Giraffe', thumb: 'media/diversity/adiv_giraffe_thumb.jpg', posters: true,
        prompt: 'A serene African savanna setting with tall grasses and scattered acacia trees. A lone giraffe … is walking peacefully. …',
        tiles: driftN('media/diversity/adiv_giraffe_') },
      { title: 'School bus', thumb: 'media/diversity/adiv_bus_thumb.jpg', posters: true,
        prompt: 'A bustling city street during rush hour, with a large, modern yellow school bus parked at the curb. …',
        tiles: driftN('media/diversity/adiv_bus_') },
      { title: 'Phone booth', thumb: 'media/diversity/adiv_booth_thumb.jpg', posters: true,
        prompt: 'A vintage phone booth in a quiet suburban street, set against a backdrop of neatly trimmed hedges and small houses. …',
        tiles: driftN('media/diversity/adiv_booth_') },
      { title: 'Gas station', thumb: 'media/diversity/adiv_gas_thumb.jpg', posters: true,
        prompt: 'A realistic daytime scene at a gas station, featuring a typical American-style convenience store with bright neon signs and pumps. …',
        tiles: driftN('media/diversity/adiv_gas_') },
      { title: 'Nursery', thumb: 'media/diversity/adiv_nursery_thumb.jpg', posters: true,
        prompt: 'A cozy nursery designed in pastel colors with soft lighting. …',
        tiles: driftN('media/diversity/adiv_nursery_') }
    ],
    // Figure 1 of the paper (figures/limitations.tex): the same prompt and noise without and with each guidance term.
    abl_antidrift: [
      { posters: true,
        prompt: 'A charming illustration in a watercolor style of a young white rabbit wearing glasses and reading a newspaper. …',
        tiles: [{ label: 'Ours', src: 'media/ablation/ad_ours.mp4', ours: true },
                { label: 'FlowMap', src: 'media/ablation/ad_flowmap.mp4' }] }
    ],
    abl_motion: [
      { posters: true,
        prompt: 'A lone young woman holds a low plank on a gym mat, then drives upward to standing and bounds across the gym. …',
        tiles: [{ label: 'Ours', src: 'media/ablation/mo_ours.mp4', ours: true },
                { label: 'FlowMap', src: 'media/ablation/mo_flowmap.mp4' }] }
    ]
  };
})();
