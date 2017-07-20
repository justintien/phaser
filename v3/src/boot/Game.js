
var Class = require('../utils/Class');
var Config = require('./Config');
var DebugHeader = require('./DebugHeader');
var Device = require('../device');
var NOOP = require('../utils/NOOP');

var AddToDOM = require('../dom/AddToDOM');
var DOMContentLoaded = require('../dom/DOMContentLoaded');
var EventDispatcher = require('../events/EventDispatcher');
var VisibilityHandler = require('./VisibilityHandler');

var AnimationManager = require('../animation/manager/AnimationManager');
var CreateRenderer = require('./CreateRenderer');
var Data = require('../plugins/Data');
var GlobalCache = require('../cache/GlobalCache');
var GlobalInputManager = require('../input/global/GlobalInputManager');
var GlobalSceneManager = require('../scene/GlobalSceneManager');
var TextureManager = require('../textures/TextureManager');
var TimeStep = require('./TimeStep');

var Game = new Class({

    initialize:

    function Game (config)
    {
        this.config = new Config(config);

        this.renderer = null;
        this.canvas = null;
        this.context = null;

        this.isBooted = false;
        this.isRunning = false;

        /**
        * @property {EventDispatcher} events - Global / Global Game System Events
        */
        this.events = new EventDispatcher();

        /**
        * @property {Phaser.AnimationManager} anims - Reference to the Phaser Animation Manager.
        */
        this.anims = new AnimationManager(this);

        /**
        * @property {Phaser.TextureManager} textures - Reference to the Phaser Texture Manager.
        */
        this.textures = new TextureManager(this);

        /**
        * @property {Phaser.Cache} cache - Reference to the assets cache.
        */
        this.cache = new GlobalCache(this);

        /**
        * @property {Phaser.Data} registry - Game wide data store.
        */
        this.registry = new Data(this);

        /**
        * @property {Phaser.Input} input - Reference to the input manager
        */
        this.input = new GlobalInputManager(this, this.config);

        /**
        * @property {Phaser.GlobalSceneManager} scene - The SceneManager. Phaser instance specific.
        */
        this.scene = new GlobalSceneManager(this, this.config.sceneConfig);

        /**
        * @property {Phaser.Device} device - Contains device information and capabilities (singleton)
        */
        this.device = Device;

        /**
        * @property {Phaser.MainLoop} mainloop - Main Loop handler.
        * @protected
        */
        this.loop = new TimeStep(this, this.config.fps);

        this.onStepCallback = NOOP;

        //  Wait for the DOM Ready event, then call boot.
        DOMContentLoaded(this.boot.bind(this));

        //  For debugging only
        window.game = this;
    },

    boot: function ()
    {
        this.isBooted = true;

        this.config.preBoot();

        DebugHeader(this);

        CreateRenderer(this);

        AddToDOM(this.canvas, this.config.parent);

        this.anims.boot(this.textures);

        this.scene.boot();

        this.input.boot();

        this.isRunning = true;

        this.config.postBoot();

        this.loop.start(this.step.bind(this));

        VisibilityHandler(this.events);

        this.events.on('HIDDEN', this.onHidden.bind(this));
        this.events.on('VISIBLE', this.onVisible.bind(this));
        this.events.on('ON_BLUR', this.onBlur.bind(this));
        this.events.on('ON_FOCUS', this.onFocus.bind(this));
    },

    step: function (time, delta)
    {
        var active = this.scene.active;
        var renderer = this.renderer;

        //  Global Managers (Time, Input, etc)

        this.input.update(time, delta);

        //  Scenes

        this.onStepCallback();

        for (var i = 0; i < active.length; i++)
        {
            active[i].scene.sys.step(time, delta);
        }

        //  Render

        // var interpolation = this.frameDelta / this.timestep;

        renderer.preRender();

        //  This uses active.length, in case scene.update removed the scene from the active list
        for (i = 0; i < active.length; i++)
        {
            active[i].scene.sys.render(0, renderer);
        }

        renderer.postRender();
    },

    onHidden: function ()
    {
        this.loop.pause();

        // var active = this.scene.active;

        // for (var i = 0; i < active.length; i++)
        // {
        //     active[i].scene.sys.pause();
        // }
    },

    onVisible: function ()
    {
        this.loop.resume();

        // var active = this.scene.active;

        // for (var i = 0; i < active.length; i++)
        // {
        //     active[i].scene.sys.resume();
        // }
    },

    onBlur: function ()
    {
        this.loop.blur();
    },

    onFocus: function ()
    {
        this.loop.focus();
    }

});

module.exports = Game;
