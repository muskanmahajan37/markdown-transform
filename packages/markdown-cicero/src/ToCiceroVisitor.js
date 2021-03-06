/*
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

const { NS_PREFIX_CiceroMarkModel } = require('./externalModels/CiceroMarkModel');

/**
 * Converts a CommonMark DOM to a CiceroMark DOM
 */
class ToCiceroMarkVisitor {

    /**
     * Remove newline which is part of the code block markup
     * @param {string} text - the code block text in the AST
     * @return {string} the code block text without the new line due to markup
     */
    static codeBlockContent(text) {
        // Remove last new line, needed by CommonMark parser to identify ending code block (\n```)
        const result = text.charAt(text.length - 1) === '\n' ? text.substring(0, text.length - 1) : text;
        return result;
    }

    /**
     * Visits a sub-tree and return CiceroMark DOM
     * @param {*} visitor the visitor to use
     * @param {*} thing the node to visit
     * @param {*} [parameters] optional parameters
     */
    static visitChildren(visitor, thing, parameters) {
        if(thing.nodes) {
            ToCiceroMarkVisitor.visitNodes(visitor, thing.nodes, parameters);
        }
    }

    /**
     * Visits a list of nodes and return the CiceroMark DOM
     * @param {*} visitor the visitor to use
     * @param {*} things the list node to visit
     * @param {*} [parameters] optional parameters
     */
    static visitNodes(visitor, things, parameters) {
        things.forEach(node => {
            node.accept(visitor, parameters);
        });
    }

    /**
     * Visit a node
     * @param {*} thing the object being visited
     * @param {*} parameters the parameters
     */
    visit(thing, parameters) {
        switch(thing.getType()) {
        case 'CodeBlock': {
            const tag = thing.tag;
            if (tag && tag.tagName === 'clause' && tag.attributes.length === 2) {
                const ciceroMarkTag = NS_PREFIX_CiceroMarkModel + 'Clause';
                // Remove last new line, needed by CommonMark parser to identify ending code block (\n```)
                const clauseText = ToCiceroMarkVisitor.codeBlockContent(thing.text);

                //console.log('CONTENT! : ' + tag.content);
                if (ToCiceroMarkVisitor.getAttribute(tag.attributes, 'src') &&
                    ToCiceroMarkVisitor.getAttribute(tag.attributes, 'clauseid')) {
                    thing.$classDeclaration = parameters.modelManager.getType(ciceroMarkTag);
                    thing.src = ToCiceroMarkVisitor.getAttribute(tag.attributes, 'src').value;
                    thing.clauseid = ToCiceroMarkVisitor.getAttribute(tag.attributes, 'clauseid').value;

                    thing.nodes = parameters.commonMark.fromMarkdown(clauseText).nodes;
                    ToCiceroMarkVisitor.visitNodes(this, thing.nodes, parameters);

                    thing.text = null; // Remove text
                    delete thing.tag;
                    delete thing.info;
                } else {
                    //console.log('Found Clause but without \'clauseid\' and \'src\' attributes ');
                }
            } else if (tag && tag.tagName === 'list' && tag.attributes.length === 0) {
                const ciceroMarkTag = NS_PREFIX_CiceroMarkModel + 'ListVariable';
                // Remove last new line, needed by CommonMark parser to identify ending code block (\n```)
                const clauseText = ToCiceroMarkVisitor.codeBlockContent(thing.text);

                const newNodes = parameters.commonMark.fromMarkdown(clauseText).nodes;
                if (newNodes.length === 1 && newNodes[0].getType() === 'List') {
                    const listNode = newNodes[0];
                    thing.$classDeclaration = parameters.modelManager.getType(ciceroMarkTag);
                    thing.type = listNode.type;
                    thing.start = listNode.start;
                    thing.tight = listNode.tight;
                    thing.delimiter = listNode.delimiter;
                    thing.nodes = listNode.nodes;
                    ToCiceroMarkVisitor.visitNodes(this, thing.nodes, parameters);

                    thing.text = null; // Remove text
                    delete thing.tag;
                    delete thing.info;
                } else {
                    //console.log('List block does not contain a list');
                }
            }
        }
            break;
        //case 'HtmlBlock':
        case 'HtmlInline': {
            if (thing.tag &&
                thing.tag.tagName === 'variable' &&
                thing.tag.attributes.length === 2) {
                const tag = thing.tag;
                if (ToCiceroMarkVisitor.getAttribute(tag.attributes, 'id') &&
                    ToCiceroMarkVisitor.getAttribute(tag.attributes, 'value')) {
                    const ciceroMarkTag = NS_PREFIX_CiceroMarkModel + 'Variable';
                    thing.$classDeclaration = parameters.modelManager.getType(ciceroMarkTag);
                    thing.id = ToCiceroMarkVisitor.getAttribute(tag.attributes, 'id').value;
                    thing.value = decodeURIComponent(ToCiceroMarkVisitor.getAttribute(tag.attributes, 'value').value);
                    delete thing.tag;
                    delete thing.text;
                } else {
                    //console.log('Found Variable but without \'id\' and \'value\' attributes ');
                }
            }
            if (thing.tag &&
                thing.tag.tagName === 'if' &&
                thing.tag.attributes.length === 4) {
                const tag = thing.tag;
                if (ToCiceroMarkVisitor.getAttribute(tag.attributes, 'id') &&
                    ToCiceroMarkVisitor.getAttribute(tag.attributes, 'value') &&
                    ToCiceroMarkVisitor.getAttribute(tag.attributes, 'whenTrue') &&
                    ToCiceroMarkVisitor.getAttribute(tag.attributes, 'whenFalse')) {
                    const ciceroMarkTag = NS_PREFIX_CiceroMarkModel + 'ConditionalVariable';
                    thing.$classDeclaration = parameters.modelManager.getType(ciceroMarkTag);
                    thing.id = ToCiceroMarkVisitor.getAttribute(tag.attributes, 'id').value;
                    thing.value = decodeURIComponent(ToCiceroMarkVisitor.getAttribute(tag.attributes, 'value').value);
                    thing.whenTrue = decodeURIComponent(ToCiceroMarkVisitor.getAttribute(tag.attributes, 'whenTrue').value);
                    thing.whenFalse = decodeURIComponent(ToCiceroMarkVisitor.getAttribute(tag.attributes, 'whenFalse').value);
                    delete thing.tag;
                    delete thing.text;
                } else {
                    //console.log('Found Variable but without \'id\' and \'value\' attributes ');
                }
            }
            if (thing.tag && thing.tag.tagName === 'computed' && thing.tag.attributes.length === 1) {
                const tag = thing.tag;
                const ciceroMarkTag = NS_PREFIX_CiceroMarkModel + 'ComputedVariable';
                if (ToCiceroMarkVisitor.getAttribute(tag.attributes, 'value')) {
                    thing.$classDeclaration = parameters.modelManager.getType(ciceroMarkTag);
                    thing.value = decodeURIComponent(ToCiceroMarkVisitor.getAttribute(tag.attributes, 'value').value);
                    delete thing.tag;
                    delete thing.text;
                }
                else {
                    //console.log('Found ComputedVariable but without \'value\' attributes ');
                }
            }
        }
            break;
        default:
            ToCiceroMarkVisitor.visitChildren(this, thing, parameters);
        }
    }

    /**
     * Find an attribute from its name
     * @param {*} attributes - the array of attributes
     * @param {string} name - the name of the attributes
     * @return {*} the attribute or undefined
     */
    static getAttribute(attributes, name) {
        return attributes.filter(x => x.name === name)[0];
    }

}

module.exports = ToCiceroMarkVisitor;