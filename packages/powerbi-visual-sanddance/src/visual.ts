// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
module powerbi.extensibility.visual {
    "use strict";

    export interface FormatLayout {
        charttype: SandDance.types.Chart;
    }

    export interface Settings {
        layout: FormatLayout;
    }

    export interface Global {
        SandDance?: typeof SandDance;
    }

    export let global: Global = {};

    export class Visual implements IVisual {
        private settings: Settings;
        private viewer: SandDance.Viewer;
        private viewElement: HTMLElement;
        private errorElement: HTMLElement;
        private ordinalMap: SandDance.types.OrdinalMap;

        constructor(options: VisualConstructorOptions) {
            //un-comment for debug
            //console.log('Visual constructor', options);

            options.element.style.position = 'relative'
            this.viewElement = htmlHelpers.addDiv(options.element, 'sanddance-view');
            this.errorElement = htmlHelpers.addDiv(options.element, 'sanddance-error');
            this.errorElement.style.position = 'absolute';

            this.settings = {
                layout: {
                    charttype: 'barchart'
                }
            };

            var w = window as any as {
                vega: SandDance.VegaDeckGl.types.VegaBase;
                deck: SandDance.VegaDeckGl.types.DeckBase & SandDance.VegaDeckGl.types.DeckLayerBase;
                luma: SandDance.VegaDeckGl.types.LumaBase;
                SandDance: typeof SandDance;
            };
            var deck = w.deck;
            var luma = w.luma;
            var vega = w.vega as SandDance.VegaDeckGl.types.VegaBase;
            global.SandDance = w.SandDance;

            vega.scheme("pbi", (value: any) => {
                const color = options.host.colorPalette.getColor(value);
                return color.value;
            });

            global.SandDance.use(vega, deck, deck, luma);
            this.viewer = new global.SandDance.Viewer(this.viewElement);

            this.showMessage(messages.selectData);
        }

        public showMessage(errorHTML: string) {
            this.errorElement.innerHTML = errorHTML;
            if (errorHTML) {
                this.viewElement.style.display = 'none';
            } else {
                this.viewElement.style.display = '';
            }
        }

        private getGlSize() {
            const original = this.viewElement.style.display;
            this.viewElement.style.display = '';
            const gl = this.viewer.presenter.getElement(global.SandDance.VegaDeckGl.PresenterElement.gl);
            const size: SandDance.types.Size = { height: gl.offsetHeight, width: gl.offsetWidth };
            this.viewElement.style.display = original;
            return size;
        }

        public update(options: VisualUpdateOptions) {
            //un-comment for debug
            //console.log('Visual update', options);

            const dataView = options && options.dataViews && options.dataViews[0];
            if (!dataView) {
                this.showMessage(messages.selectData);
                return;
            }

            let formatLayout = dataView.metadata && dataView.metadata.objects && (dataView.metadata.objects as any as Settings).layout;
            if (formatLayout) {
                this.settings.layout = { ... this.settings.layout, ...formatLayout };
            }

            if (dataView.table &&
                dataView.metadata &&
                dataView.metadata.columns &&
                dataView.metadata.columns.length > 0 &&
                dataView.table.rows) {

                const metaDataColumns = getColumnsWithRoles(dataView.metadata.columns, ['uid', 'x', 'y', 'z', 'color', 'sort']);
                const data = getDataRows(metaDataColumns, dataView.table.rows);
                const insight = getInsight(this.settings, this.getGlSize(), metaDataColumns);
                if (metaDataColumns.color) {
                    insight.scheme = "pbi";
                }
                this.viewer.render(insight, data, { ordinalMap: this.ordinalMap }).then(renderResult => {
                    if (renderResult.specResult.errors) {
                        this.showMessage(messages.chartErrors(renderResult.specResult.errors));
                    } else {
                        this.ordinalMap = renderResult.ordinalMap;
                        this.showMessage('');
                        //console.log('viewer.render', this.viewer.vegaSpec);
                    }
                });
            } else {
                this.showMessage(messages.noData);
            }
        }

        /**
         * Enumerates through the objects defined in the capabilities and adds the properties to the format pane
         *
         * @function
         * @param {EnumerateVisualObjectInstancesOptions} options - Map of defined objects
         */
        public enumerateObjectInstances(options: EnumerateVisualObjectInstancesOptions): VisualObjectInstanceEnumeration {
            let objectName = options.objectName;
            let objectEnumeration: VisualObjectInstance[] = [];

            switch (objectName) {
                case 'layout':
                    var o: VisualObjectInstance = {
                        objectName: objectName,
                        properties: this.settings.layout as any,
                        selector: null
                    };
                    objectEnumeration.push(o);
                    break;
            };
            return objectEnumeration;
        }
    }
}