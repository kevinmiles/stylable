const { EOL } = require('os');
const Module = require('webpack/lib/Module');
const RawSource = require('webpack-sources').RawSource;
const { StylableImportDependency } = require('./StylableDependencies');
const {
    renderStaticCSS,
    getStylableModulesFromDependencies
} = require('./stylable-module-helpers');

const { RENDERER_SYMBOL, STYLESHEET_SYMBOL } = require('./runtime-dependencies');

class StylableBootstrapModule extends Module {
    constructor(
        context,
        chunk,
        runtimeRenderer,
        options = {
            autoInit: true,
            globalInjection(symbol) {
                return `window.__stylable_renderer__ = ${symbol}`;
            }
        },
        dependencies = [],
        name = 'stylable-bootstrap-module',
        type = 'stylable-bootstrap'
    ) {
        super('javascript/auto', context);
        this.chunk = chunk;
        this.runtimeRenderer = runtimeRenderer;
        this.options = options;
        // from plugin
        this.dependencies = dependencies;
        this.name = name;
        this.type = type;
        this.built = true;
        this.hash = '';
        this.buildMeta = {};
        this.buildInfo = {};
        this.usedExports = [];
    }

    identifier() {
        return `stylable-bootstrap ${this.name}`;
    }

    readableIdentifier() {
        return this.identifier();
    }

    build(options, compilation, resolver, fs, callback) {
        return callback();
    }
    source(m, runtimeTemplate) {
        const entry = [];
        const imports = [];
        this.dependencies.forEach(dependency => {
            const id = runtimeTemplate.moduleId({
                module: dependency.module,
                request: dependency.request
            });
            imports.push(`__webpack_require__(${id});`);
        });

        let renderingCode = [];
        if (this.runtimeRenderer) {
            const id = runtimeTemplate.moduleId({
                module: this.runtimeRenderer,
                request: this.runtimeRenderer.request
            });
            renderingCode.push(`var ${RENDERER_SYMBOL} = __webpack_require__(${id}).$;`);
            if (this.options.globalInjection) {
                renderingCode.push(this.options.globalInjection(RENDERER_SYMBOL));
            }

            renderingCode.push(...imports);

            if (this.options.autoInit) {
                renderingCode.push(`if(typeof window !== 'undefined') { ${RENDERER_SYMBOL}.init(window); }`);
            }
            this.__source = new RawSource(renderingCode.join(EOL));
        } else {
            this.__source = new RawSource(imports.join(EOL));
        }

        return this.__source;
    }

    needRebuild() {
        return false;
    }

    size() {
        return this.__source ? this.__source.size() : 1;
    }
    updateHash(hash) {
        hash.update(this.identifier());
        super.updateHash(hash || '');
    }
    addStylableModuleDependency(module) {
        const dep = new StylableImportDependency(module.request, {
            defaultImport: `style_${this.dependencies.length}`,
            names: []
        });
        dep.module = module;
        this.dependencies.push(dep);
    }
    renderStaticCSS(mainTemplate, hash, filter = Boolean) {
        return renderStaticCSS(
            getStylableModulesFromDependencies(this.dependencies),
            mainTemplate,
            hash,
            filter
        );
    }
}

module.exports.StylableBootstrapModule = StylableBootstrapModule;
