/**
 * @author       Richard Davey <rich@photonstorm.com>
 * @copyright    2022 Photon Storm Ltd.
 * @license      {@link https://github.com/photonstorm/phaser/blob/master/license.txt|MIT License}
 */

var Class = require('../../../src/utils/Class');
var GetFastValue = require('../../../src/utils/object/GetFastValue');
var ImageFile = require('../../../src/loader/filetypes/ImageFile.js');
var IsPlainObject = require('../../../src/utils/object/IsPlainObject');
var JSONFile = require('../../../src/loader/filetypes/JSONFile.js');
var MultiFile = require('../../../src/loader/MultiFile.js');
var TextFile = require('../../../src/loader/filetypes/TextFile.js');

/**
 * @typedef {object} Phaser.Loader.FileTypes.SpineFileConfig
 *
 * @property {string} key - The key of the file. Must be unique within both the Loader and the Texture Manager.
 * @property {string|string[]} [jsonURL] - The absolute or relative URL to load the JSON file from. If undefined or `null` it will be set to `<key>.json`, i.e. if `key` was "alien" then the URL will be "alien.json".
 * @property {string} [atlasURL] - The absolute or relative URL to load the texture atlas data file from. If undefined or `null` it will be set to `<key>.txt`, i.e. if `key` was "alien" then the URL will be "alien.txt".
 * @property {boolean} [preMultipliedAlpha=false] - Do the textures contain pre-multiplied alpha or not?
 * @property {XHRSettingsObject} [jsonXhrSettings] - An XHR Settings configuration object for the json file. Used in replacement of the Loaders default XHR Settings.
 * @property {XHRSettingsObject} [atlasXhrSettings] - An XHR Settings configuration object for the atlas data file. Used in replacement of the Loaders default XHR Settings.
 */

/**
 * @classdesc
 * A Spine File suitable for loading by the Loader.
 *
 * These are created when you use the Phaser.Loader.LoaderPlugin#spine method and are not typically created directly.
 *
 * For documentation about what all the arguments and configuration options mean please see Phaser.Loader.LoaderPlugin#spine.
 *
 * @class SpineFile
 * @extends Phaser.Loader.MultiFile
 * @memberof Phaser.Loader.FileTypes
 * @constructor
 *
 * @param {Phaser.Loader.LoaderPlugin} loader - A reference to the Loader that is responsible for this file.
 * @param {(string|Phaser.Loader.FileTypes.SpineFileConfig)} key - The key to use for this file, or a file configuration object.
 * @param {string|string[]} [jsonURL] - The absolute or relative URL to load the JSON file from. If undefined or `null` it will be set to `<key>.json`, i.e. if `key` was "alien" then the URL will be "alien.json".
 * @param {string} [atlasURL] - The absolute or relative URL to load the texture atlas data file from. If undefined or `null` it will be set to `<key>.txt`, i.e. if `key` was "alien" then the URL will be "alien.txt".
 * @param {boolean} [preMultipliedAlpha=false] - Do the textures contain pre-multiplied alpha or not?
 * @param {XHRSettingsObject} [jsonXhrSettings] - An XHR Settings configuration object for the json file. Used in replacement of the Loaders default XHR Settings.
 * @param {XHRSettingsObject} [atlasXhrSettings] - An XHR Settings configuration object for the atlas data file. Used in replacement of the Loaders default XHR Settings.
 */
var SpineFile = new Class({

    Extends: MultiFile,

    initialize:

    function SpineFile (loader, key, jsonURL, atlasURL, preMultipliedAlpha, jsonXhrSettings, atlasXhrSettings)
    {
        var i;
        var json;
        var atlas;
        var files = [];
        var cache = loader.cacheManager.custom.spine;

        //  atlas can be an array of atlas files, not just a single one

        if (IsPlainObject(key))
        {
            var config = key;

            key = GetFastValue(config, 'key');

            json = new JSONFile(loader, {
                key: key,
                url: GetFastValue(config, 'jsonURL'),
                extension: GetFastValue(config, 'jsonExtension', 'json'),
                xhrSettings: GetFastValue(config, 'jsonXhrSettings')
            });

            atlasURL = GetFastValue(config, 'atlasURL');
            preMultipliedAlpha = GetFastValue(config, 'preMultipliedAlpha');

            if (!Array.isArray(atlasURL))
            {
                atlasURL = [ atlasURL ];
            }

            for (i = 0; i < atlasURL.length; i++)
            {
                atlas = new TextFile(loader, {
                    key: key + '!' + i,
                    url: atlasURL[i],
                    extension: GetFastValue(config, 'atlasExtension', 'atlas'),
                    xhrSettings: GetFastValue(config, 'atlasXhrSettings')
                });

                atlas.cache = cache;

                files.push(atlas);
            }
        }
        else
        {
            json = new JSONFile(loader, key, jsonURL, jsonXhrSettings);

            if (!Array.isArray(atlasURL))
            {
                atlasURL = [ atlasURL ];
            }

            for (i = 0; i < atlasURL.length; i++)
            {
                atlas = new TextFile(loader, key + '!' + i, atlasURL[i], atlasXhrSettings);
                atlas.cache = cache;

                files.push(atlas);
            }
        }

        files.unshift(json);

        MultiFile.call(this, loader, 'spine', key, files);

        this.config.preMultipliedAlpha = preMultipliedAlpha;
    },

    /**
     * Called by each File when it finishes loading.
     *
     * @method Phaser.Loader.FileTypes.SpineFile#onFileComplete
     * @since 3.19.0
     *
     * @param {Phaser.Loader.File} file - The File that has completed processing.
     */
    onFileComplete: function (file)
    {
        var index = this.files.indexOf(file);

        if (index !== -1)
        {
            this.pending--;

            if (file.type === 'text')
            {
                //  Inspect the data for the files to now load
                var content = file.data.split('\n');

                //  Extract the textures
                var textures = [ content[0] ];

                for (var t = 0; t < content.length; t++)
                {
                    var line = content[t];

                    if (line.trim() === '' && t < content.length - 1)
                    {
                        line = content[t + 1];

                        textures.push(line);
                    }
                }

                var config = this.config;
                var loader = this.loader;

                var currentBaseURL = loader.baseURL;
                var currentPath = loader.path;
                var currentPrefix = loader.prefix;

                var baseURL = GetFastValue(config, 'baseURL', this.baseURL);
                var path = GetFastValue(config, 'path', file.src.match(/^.*\//))[0];
                var prefix = GetFastValue(config, 'prefix', this.prefix);
                var textureXhrSettings = GetFastValue(config, 'textureXhrSettings');

                loader.setBaseURL(baseURL);
                loader.setPath(path);
                loader.setPrefix(prefix);

                // 手機記憶體防護: 由使用者提供的 URL 處理器縮放過大的 spine 頁面
                var memGuard = SpineFile.prototype._getSpineMemoryGuardConfig();
                var imageURLProcessor = memGuard && memGuard.imageURLProcessor;
                var serverResize = !!(memGuard && memGuard.cdnResize && typeof imageURLProcessor === 'function');
                var guardMax = memGuard ? (memGuard.maxTextureSize || 1024) : 0;
                var pageSizes = memGuard
                    ? SpineFile.prototype._parseSpineAtlasPageSizes(file.data)
                    : {};
                var displayScale = Number(GetFastValue(config, 'spineDisplayScale', 0)) || 0;
                var guardTarget = memGuard && typeof memGuard.getTextureTargetSize === 'function'
                    ? memGuard.getTextureTargetSize(pageSizes, displayScale)
                    : guardMax;
                guardTarget = memGuard
                    ? Math.max(1, Math.round(guardTarget || guardMax))
                    : 0;

                for (var i = 0; i < textures.length; i++)
                {
                    var pageName = textures[i];

                    var key = pageName;
                    var loadURL = pageName;
                    var cacheBustQS = GetFastValue(config, 'cacheBustQS', '');
                    if (cacheBustQS)
                    {
                        var qsSep = loadURL.indexOf('?') !== -1 ? '&' : '?';
                        loadURL = loadURL + qsSep + cacheBustQS;
                    }

                    var d = pageSizes[pageName];
                    var processorContext = d ? {
                        type: 'spine',
                        pageName: pageName,
                        premultipliedAlpha: d.pma === true,
                        sourceWidth: d.w,
                        sourceHeight: d.h
                    } : null;

                    if (serverResize && guardTarget > 0 && d)
                    {
                        var longest = Math.max(d.w, d.h);
                        if (longest > guardTarget)
                        {
                            var reqW = Math.max(1, Math.round((d.w * guardTarget) / longest));

                            // path 通常已是 atlas 的絕對目錄, 只有在不是時才補上 baseURL
                            var absURL = /^https?:\/\//.test(path)
                                ? path + loadURL
                                : (baseURL || '') + (path || '') + loadURL;
                            var q = memGuard.cdnResizeQuality || 100;
                            var processedURL = imageURLProcessor(absURL, reqW, q, processorContext);
                            if (typeof processedURL === 'string' && processedURL)
                            {
                                loadURL = processedURL;
                            }
                        }
                    }

                    var image = new ImageFile(loader, key, loadURL, textureXhrSettings);

                    if (!loader.keyExists(image))
                    {
                        this.addToMultiFile(image);

                        loader.addFile(image);
                    }
                }

                //  Reset the loader settings
                loader.setBaseURL(currentBaseURL);
                loader.setPath(currentPath);
                loader.setPrefix(currentPrefix);
            }
        }
    },

    // ========================================================================
    // Spine 手機記憶體防護 輔助函式
    // ========================================================================

    /**
     * 回傳 spine 記憶體防護設定, 若停用則回傳 null
     * 設定來源為 window.__GE_RENDER_SPINE_MEMORY_GUARD__
     *
     * imageURLProcessor(url, width, quality, context) 應回傳最終影像 URL
     *
     * @returns {?object} { enabled, maxTextureSize, imageURLProcessor }
     */
    _getSpineMemoryGuardConfig: function ()
    {
        var config = window.__GE_RENDER_SPINE_MEMORY_GUARD__;
        if (!config || !config.enabled)
        {
            return null;
        }
        return config;
    },

    /**
     * 從圖集解析每一頁的尺寸, 同時支援精簡的 4.1/4.2 格式 (無縮排, size:W,H)
     * 與舊版有縮排的格式
     *
     * @param {string} atlasText - 原始圖集文字
     * @returns {object} pageName -> { w, h, pma } 的對照表
     */
    _parseSpineAtlasPageSizes: function (atlasText)
    {
        var lines = atlasText.split('\n');
        var sizes = {};
        var cur = null;
        var expecting = true;
        var IMG = /\.(png|webp|jpg|jpeg)$/i;
        for (var i = 0; i < lines.length; i++)
        {
            var raw = lines[i];
            var t = raw.trim();
            var indented = /^\s/.test(raw);
            if (t === '')
            {
                cur = null;
                expecting = true;
                continue;
            }
            if (!indented && (expecting || cur === null) && IMG.test(t))
            {
                cur = t;
                expecting = false;
                continue;
            }
            expecting = false;
            if (cur && /^size\s*:/i.test(t))
            {
                var parts = t.substring(t.indexOf(':') + 1).split(',');
                var w = parseInt(parts[0], 10);
                var h = parseInt(parts[1], 10);
                if (!isNaN(w) && !isNaN(h))
                {
                    sizes[cur] = sizes[cur] || { w: 0, h: 0, pma: false };
                    sizes[cur].w = w;
                    sizes[cur].h = h;
                }
            }
            else if (cur && (/^pma\s*:/i).test(t))
            {
                sizes[cur] = sizes[cur] || { w: 0, h: 0, pma: false };
                sizes[cur].pma = t.substring(t.indexOf(':') + 1).trim().toLowerCase() === 'true';
            }
        }
        return sizes;
    },

    /**
     * 將 atlas metadata 依 CDN 實際回傳的貼圖尺寸等比例換算。
     * Spine runtime 的 mesh trim offset 會使用實際 texture 尺寸，因此 server resize 後仍需同步 metadata。
     *
     * @param {string} atlasData - 原始圖集文字
     * @param {object} actualDims - pageName -> { w, h } CDN 回傳尺寸的對照表
     * @returns {string}
     */
    _scaleSpineAtlasData: function (atlasData, actualDims)
    {
        var lines = atlasData.split('\n');
        var result = [];
        var IMG = /\.(png|webp|jpg|jpeg)$/i;
        var dim = null;
        var sx = 1;
        var sy = 1;
        var seenPageSize = false;
        var expecting = true;

        var lookup = function (page)
        {
            if (actualDims[page])
            {
                return actualDims[page];
            }
            for (var k in actualDims)
            {
                if (actualDims.hasOwnProperty(k) && k.endsWith(page))
                {
                    return actualDims[k];
                }
            }
            return null;
        };
        var scaleCoord = function (line, keys)
        {
            var m = line.match(/^(\s*)([A-Za-z]+)\s*:\s*(.+)$/);
            if (!m || keys.indexOf(m[2].toLowerCase()) === -1)
            {
                return null;
            }
            var vals = m[3].split(',').map(function (v, idx)
            {
                var n = parseInt(v.trim(), 10);
                if (isNaN(n))
                {
                    return v.trim();
                }
                return String(Math.round(n * (idx % 2 === 0 ? sx : sy)));
            });
            return m[1] + m[2] + ':' + vals.join(',');
        };

        for (var i = 0; i < lines.length; i++)
        {
            var raw = lines[i];
            var t = raw.trim();
            var indented = /^\s/.test(raw);

            if (t === '')
            {
                result.push(raw);
                dim = null;
                sx = 1;
                sy = 1;
                seenPageSize = false;
                expecting = true;
                continue;
            }
            if (!indented && (expecting || dim === null) && IMG.test(t))
            {
                dim = lookup(t);
                sx = 1;
                sy = 1;
                seenPageSize = false;
                expecting = false;
                result.push(raw);
                continue;
            }
            expecting = false;

            if (!seenPageSize && /^size\s*:/i.test(t))
            {
                seenPageSize = true;
                var parts = t.substring(t.indexOf(':') + 1).split(',');
                var ow = parseInt(parts[0], 10);
                var oh = parseInt(parts[1], 10);
                if (dim && !isNaN(ow) && !isNaN(oh) && ow > 0 && oh > 0)
                {
                    sx = dim.w / ow;
                    sy = dim.h / oh;
                    var im = raw.match(/^(\s*)/);
                    result.push(im[1] + 'size:' + dim.w + ',' + dim.h);
                    continue;
                }
                result.push(raw);
                continue;
            }

            if (sx !== 1 || sy !== 1)
            {
                var scaled = scaleCoord(raw, [ 'bounds', 'offsets' ]) ||
                    scaleCoord(raw, [ 'xy', 'size', 'orig', 'offset' ]);
                if (scaled !== null)
                {
                    result.push(scaled);
                    continue;
                }
            }
            result.push(raw);
        }

        return result.join('\n');
    },

    /**
     * Adds this file to its target cache upon successful loading and processing.
     *
     * @method Phaser.Loader.FileTypes.SpineFile#addToCache
     * @since 3.19.0
     */
    addToCache: function ()
    {
        if (this.isReadyToProcess())
        {
            var fileJSON = this.files[0];

            fileJSON.addToCache();

            var atlasCache;
            var atlasKey = '';
            var combinedAtlasData = '';
            var preMultipliedAlpha = (this.config.preMultipliedAlpha) ? true : false;
            var textureManager = this.loader.textureManager;

            // CDN resize 後要以實際回傳尺寸同步 atlas metadata
            var memGuard = SpineFile.prototype._getSpineMemoryGuardConfig();
            var actualDims = {}; // pageName -> { w, h } 實際上傳的尺寸

            for (var i = 1; i < this.files.length; i++)
            {
                var file = this.files[i];

                if (file.type === 'text')
                {
                    atlasKey = file.key.replace(/![\d]$/, '');

                    atlasCache = file.cache;

                    combinedAtlasData = combinedAtlasData.concat(file.data);
                }
                else
                {
                    var src = file.key.trim();
                    var pos = src.indexOf('!');
                    var key = src.substr(pos + 1);

                    if (!textureManager.exists(key))
                    {
                        var imageSource = file.data;

                        if (memGuard)
                        {
                            actualDims[key] = {
                                w: imageSource.naturalWidth || imageSource.width,
                                h: imageSource.naturalHeight || imageSource.height
                            };
                        }

                        textureManager.addImage(key, imageSource);
                    }

                    // 記憶體修正: 盡早把 file.data 設為 null 以釋放已解碼的影像
                    file.data = null;
                }

                file.pendingDestroy();
            }

            // 將圖集座標改寫成 CDN 實際回傳的尺寸
            if (memGuard && Object.keys(actualDims).length > 0)
            {
                combinedAtlasData = SpineFile.prototype._scaleSpineAtlasData(combinedAtlasData, actualDims);
            }

            atlasCache.add(atlasKey, { preMultipliedAlpha: preMultipliedAlpha, data: combinedAtlasData, prefix: this.prefix });

            this.complete = true;
        }
    }

});

module.exports = SpineFile;
